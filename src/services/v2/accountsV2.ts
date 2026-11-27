/**
 * accountsV2.ts
 *
 * Sends through accounts v2 (ACCOUNTS_V2_SENDS): a dauth session for the
 * signed-in account's wallet, then UserOperations from its kernel through the
 * accounts gas proxy, so no ZeroDev key is needed in the browser. Everything
 * signs with the current Turnkey session stamper. The DPoP key and the dauth
 * session stay in module memory: never in localStorage, sessionStorage or
 * IndexedDB. Part of the wallet chunk, reached only through turnkeyService.
 */
import {
  AccountsError,
  claimDid,
  DirectoryUnavailableError,
  type DpopKey,
  generateDpopKey,
  lookupByWallet,
  NetworkError,
  RemovePhoneFirstError,
  removePhone,
  type SdkConfig,
  sendUserOperation,
  type Session,
  signIn,
  SigninError,
  smartAccountAddress,
  TurnkeyWalletSigner,
  turnkeyWalletDidKey,
  waitForUserOperationReceipt,
} from '@dimo-network/transactions/accounts';
import type { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { TurnkeyClient } from '@turnkey/http';
import { createAccount } from '@turnkey/viem';
import type { Hex, LocalAccount } from 'viem';

import { accountsV2SendsEnabled } from '../../utils/featureFlags';
import { getSessionStamper, getSessionStamperExpiry } from '../sessionStamper';
import { getKernelSigner } from '../turnkeyService';

const POLYGON = 137;
const POLYGON_AMOY = 80002;
// A send takes up to 30 s and its receipt wait up to 120 s, so a session (dauth
// and Turnkey both) with less than this left isn't used for one.
const SEND_MARGIN_MS = 180_000;
// Signing in: each request to accounts, dauth, the directory or the RPC, and
// the whole of it, past which the send goes as before.
const REQUEST_TIMEOUT_MS = 10_000;
const SIGN_IN_BUDGET_MS = 20_000;

export type V2Unavailable = {
  kind: 'unavailable';
  reason:
    | 'flag_off'
    | 'config_missing'
    | 'no_session'
    | 'address_mismatch'
    | 'claim_refused'
    | 'v2_down';
};

export type V2Ready = {
  kind: 'ready';
  session: Session;
  walletAccount: LocalAccount;
  chainId: number;
};

/** The signed-in account, as the accounts API records it (UserObject fits). */
export type V2User = {
  subOrganizationId: string;
  walletAddress?: Hex | null;
  smartContractAddress?: Hex | null;
};

export type V2Call = { to: Hex; value?: bigint; data?: Hex };

const chainId = () =>
  process.env.REACT_APP_ENVIRONMENT === 'prod' ? POLYGON : POLYGON_AMOY;

/**
 * The SDK's settings, read from the build's env on each call. Throws when one
 * isn't set, or the accounts URL isn't a URL.
 */
export const v2Config = (): SdkConfig => {
  const accountsUrl = process.env.REACT_APP_DIMO_ACCOUNTS_URL;
  const dauthUrl = process.env.REACT_APP_DAUTH_URL;
  const directoryUrl = process.env.REACT_APP_DID_DIRECTORY_URL;
  const turnkeyParentOrgId = process.env.REACT_APP_TURNKEY_PARENT_ORG_ID;
  const rpcUrl = process.env.REACT_APP_POLYGON_RPC_URL;
  if (!accountsUrl || !dauthUrl || !directoryUrl || !turnkeyParentOrgId || !rpcUrl) {
    throw new Error('Accounts v2 is not configured');
  }
  return {
    // The v1 setting ends in /api; the SDK adds /api/v2 to the origin itself.
    accountsUrl: new URL(accountsUrl).origin,
    dauthUrl,
    directoryUrl,
    turnkeyParentOrgId,
    rpcUrls: { [chainId()]: rpcUrl },
  };
};

const unavailable = (reason: V2Unavailable['reason']): V2Unavailable => ({
  kind: 'unavailable',
  reason,
});

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A service that couldn't be reached or answered 5xx: no answer either way. */
const noAnswer = (error: unknown) =>
  error instanceof NetworkError ||
  error instanceof DirectoryUnavailableError ||
  ((error instanceof SigninError || error instanceof AccountsError) &&
    error.status >= 500);

// The ready session, for one account and the Turnkey session that signed it in.
let cached: { key: string; stamper: ApiKeyStamper; ready: V2Ready } | null = null;

/** Aborts `request` when `signal` does; returns the undo. */
const follow = (signal: AbortSignal | null | undefined, request: AbortController) => {
  if (!signal) return () => {};
  const abort = () => request.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort);
  return () => signal.removeEventListener('abort', abort);
};

/**
 * cfg whose fetch gives each request REQUEST_TIMEOUT_MS and keeps the signal
 * the SDK passes. Once `stop` aborts it aborts what is in flight and sends
 * nothing more. The SDK reports a rejected fetch as a NetworkError.
 */
const withTimeouts = (cfg: SdkConfig, stop: AbortSignal): SdkConfig => ({
  ...cfg,
  fetchImpl: async (input, init) => {
    stop.throwIfAborted();
    const request = new AbortController();
    const timer = setTimeout(
      () => request.abort(new DOMException('The request timed out', 'TimeoutError')),
      REQUEST_TIMEOUT_MS,
    );
    const undo = [follow(stop, request), follow(init?.signal, request)];
    try {
      return await fetch(input, { ...init, signal: request.signal });
    } finally {
      clearTimeout(timer);
      undo.forEach((unfollow) => unfollow());
    }
  },
});

/**
 * An existing v1 account's first v2 send: its DID, wallet-only (no signing
 * key), linked to the account. A sub-org that still holds the user's phone
 * number gives it up first.
 */
const claimWalletDid = async (
  cfg: SdkConfig,
  client: TurnkeyClient,
  wallet: TurnkeyWalletSigner,
  dpopKey: DpopKey,
  subOrganizationId: string,
): Promise<Session> => {
  try {
    return (await claimDid(cfg, { wallet, dpopKey })).session;
  } catch (error) {
    if (!(error instanceof RemovePhoneFirstError)) throw error;
    await removePhone(client, { subOrganizationId });
    return (await claimDid(cfg, { wallet, dpopKey })).session;
  }
};

/** Signs the account's wallet in to dauth (claiming its DID first if need be). Never rejects. */
const openSession = async (
  cfg: SdkConfig,
  stamper: ApiKeyStamper,
  account: { subOrganizationId: string; walletAddress: Hex; smartContractAddress: Hex },
): Promise<V2Ready | V2Unavailable> => {
  const { subOrganizationId, walletAddress, smartContractAddress } = account;
  let claiming = false;
  try {
    const client = new TurnkeyClient(
      { baseUrl: getKernelSigner().config.turnkeyApiBaseUrl },
      stamper,
    );
    const walletAccount = await createAccount({
      client,
      organizationId: subOrganizationId,
      signWith: walletAddress,
    });
    const chain = chainId();
    const kernel = await smartAccountAddress(cfg, {
      walletViemAccount: walletAccount,
      chainId: chain,
    });
    if (!sameAddress(kernel, smartContractAddress))
      return unavailable('address_mismatch');

    const wallet = new TurnkeyWalletSigner({
      client,
      organizationId: subOrganizationId,
      walletAddress,
      didKey: await turnkeyWalletDidKey(client, subOrganizationId, walletAddress),
    });
    const dpopKey = await generateDpopKey();
    const did = await lookupByWallet(cfg, { address: walletAddress });
    let session: Session;
    if (did) {
      session = await signIn(cfg, {
        did,
        signer: wallet,
        fragment: 'wallet',
        scope: ['read', 'write'],
        dpopKey,
      });
    } else {
      claiming = true;
      session = await claimWalletDid(cfg, client, wallet, dpopKey, subOrganizationId);
    }

    // Logged out (or signed in again) meanwhile: the session isn't this user's to use.
    if (getSessionStamper() !== stamper) return unavailable('no_session');
    if (!session.scopes.includes('write')) {
      console.warn('Accounts v2 unavailable (v2_down): no write scope', session.scopes);
      return unavailable('v2_down');
    }
    return { kind: 'ready', session, walletAccount, chainId: chain };
  } catch (error) {
    const reason = claiming && !noAnswer(error) ? 'claim_refused' : 'v2_down';
    console.warn(`Accounts v2 unavailable (${reason})`, error);
    return unavailable(reason);
  }
};

/**
 * A dauth session for the account's wallet, ready to send from its kernel, or
 * why v2 can't send for it (the caller then sends as before). Never throws.
 * v2 sends only from the wallet's plain kernel, so an account whose smart
 * account is another (a co-signer kernel) is address_mismatch. A wallet
 * without a DID claims one first. Signing in gets SIGN_IN_BUDGET_MS, then is
 * v2_down. A session is used only while it and the Turnkey session have
 * SEND_MARGIN_MS left, and reused for the same account and Turnkey session only.
 */
export const ensureV2Session = async (user: V2User): Promise<V2Ready | V2Unavailable> => {
  if (!accountsV2SendsEnabled()) return unavailable('flag_off');
  let cfg: SdkConfig;
  try {
    cfg = v2Config();
  } catch {
    return unavailable('config_missing');
  }
  const stamper = getSessionStamper();
  if (!stamper || (getSessionStamperExpiry() ?? 0) - Date.now() < SEND_MARGIN_MS) {
    cached = null;
    return unavailable('no_session');
  }
  const { subOrganizationId, walletAddress, smartContractAddress } = user;
  if (!walletAddress || !smartContractAddress) return unavailable('address_mismatch');

  const key = `${subOrganizationId} ${walletAddress.toLowerCase()} ${smartContractAddress.toLowerCase()}`;
  if (
    cached?.key === key &&
    cached.stamper === stamper &&
    cached.ready.session.expiresAt.getTime() - SEND_MARGIN_MS > Date.now()
  ) {
    return cached.ready;
  }
  cached = null;

  const stop = new AbortController();
  let budget: ReturnType<typeof setTimeout> | undefined;
  const outOfTime = new Promise<V2Unavailable>((resolve) => {
    budget = setTimeout(() => {
      stop.abort(
        new DOMException('Signing in to accounts v2 took too long', 'TimeoutError'),
      );
      console.warn('Accounts v2 unavailable (v2_down): signing in took too long');
      resolve(unavailable('v2_down'));
    }, SIGN_IN_BUDGET_MS);
  });
  const opened = openSession(withTimeouts(cfg, stop.signal), stamper, {
    subOrganizationId,
    walletAddress,
    smartContractAddress,
  }).then((result) => {
    // A sign-in that finished after the budget is dropped.
    if (result.kind === 'ready' && !stop.signal.aborted)
      cached = { key, stamper, ready: result };
    return result;
  });
  try {
    return await Promise.race([opened, outOfTime]);
  } finally {
    clearTimeout(budget);
  }
};

/**
 * Sends the calls as one UserOperation from the account's kernel and waits for
 * it to land. Returns the transaction hash. Throws what the SDK throws: after
 * a UserOperationUnknownError or UserOperationPendingError the operation may
 * still land, so it must not be sent again.
 */
export const sendCallsV2 = async (ready: V2Ready, calls: V2Call[]): Promise<Hex> => {
  const cfg = v2Config();
  const { session, walletAccount, chainId: chain } = ready;
  const { userOpHash, provider } = await sendUserOperation(cfg, {
    session,
    walletViemAccount: walletAccount,
    chainId: chain,
    calls,
  });
  const { transactionHash } = await waitForUserOperationReceipt(cfg, {
    session,
    chainId: chain,
    provider,
    userOpHash,
  });
  return transactionHash;
};
