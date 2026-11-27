/**
 * turnkeyService.ts
 *
 * This service handles all actions dependent on turnkey
 * using the Turnkey Client Libraries, or custom Dimo SDK's such as the transactions SDK
 *
 * Specific Responsibilities include: Signing Messages, Triggering OTP's etc
 */

import {
  accountPermissionsCalls,
  KernelSigner,
  newKernelConfig,
  Permission,
  sacdDescription,
  SetAccountPermissions,
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
  type TransactionData,
  vehiclePermissionsBulkCalls,
  vehiclePermissionsCalls,
} from '@dimo-network/transactions';
import {
  UserOperationPendingError,
  UserOperationRevertedError,
  UserOperationUnknownError,
} from '@dimo-network/transactions/accounts';
import { captureException } from '@sentry/react';
import { encodeFunctionData, type Hex } from 'viem';
import { buildDriverDocAgreements } from './accountDocumentAgreements';
import { getWebAuthnAttestation, TurnkeyClient } from '@turnkey/http';
import { WebauthnStamper } from '@turnkey/webauthn-stamper';
import { base64UrlEncode, generateRandomBuffer } from '../utils/cryptoUtils';
import { base64UrlToBytes } from '../utils/base64url';
import { VehiclePermissionDescription } from '@dimo-network/transactions/dist/core/types/args';
import { PasskeyCreationResult } from '../models/resultTypes';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { uint8ArrayToHexString } from '@turnkey/encoding';
import {
  decryptCredentialBundle,
  generateP256KeyPair,
  getPublicKey,
} from '@turnkey/crypto';
import { accountsV2SendsEnabled } from '../utils/featureFlags';
import {
  clearSessionStamper,
  getPasskeySessionSub,
  getSessionStamperExpiry,
  SEND_MARGIN_MS,
  sessionGeneration,
  setSessionStamper,
} from './sessionStamper';
import { Attachment, CloudEventAgreement } from '../types';
import { withTimeout } from '../utils/withTimeout';
import { ensureV2Session, sendCallsV2, type V2Call } from './v2/accountsV2';

// Bound every KernelSigner call (bundler/paymaster/RPC + user-op receipt). 90s is
// generous for an on-chain user operation but still finite — on expiry the caller
// surfaces an error instead of an eternal spinner. NOTE: the user operation may
// still land on-chain after the timeout; callers should treat expiry as "unknown,
// retry/refresh" rather than "definitely failed".
const KERNEL_OP_TIMEOUT_MS = 90_000;

// Bounds the whole of a v2 send: signing, the send, the receipt wait and the
// log read. The SDK bounds the send (30 s) and the receipt wait (120 s), but
// Turnkey signing has no time limit of its own.
const V2_SEND_TIMEOUT_MS = 240_000;

/**
 * A v2 send that had no answer within V2_SEND_TIMEOUT_MS, before the bundler
 * named its UserOperation. Its outcome is unknown: it may still land, so it is
 * never sent again.
 */
export class V2SendTimeoutError extends Error {
  constructor() {
    super(`The accounts v2 send had no answer within ${V2_SEND_TIMEOUT_MS} ms`);
    this.name = 'V2SendTimeoutError';
  }
}

export const passkeyStamper = new WebauthnStamper({
  rpId: process.env.REACT_APP_RPCID_URL as string,
});

export { getSessionStamper } from './sessionStamper';

let passkeyRefresh: Promise<void> | null = null;

/**
 * KernelSigner that keeps the session stamper in step with the session it holds:
 * any API-key session it opens (email code, resume, or a passkey sign-in made
 * one) is the current stamper, and a reset drops it. A flagged passkey session
 * that has lapsed is reopened with one passkey prompt at the next use, as the
 * unflagged signer does through its kept passkey client.
 *
 * Coupled to KernelSigner internals (transactions src/KernelSigner.ts, the same
 * in 0.4.1 and 0.5.0); check these lines on every SDK bump:
 * - getActiveClient (:201-230) is what every action calls, as
 *   `this.getActiveClient()`, before the send and again for the receipt, so
 *   this override sees both: executeTransaction :1286 and :1304,
 *   setVehiclePermissions :590 and :604, setVehiclePermissionsBulk :620 and
 *   :626, setAccountPermissions :697 and :711;
 * - openSessionWithApiStamper (:436-462) sets walletAddress and
 *   subOrganizationId (:450-451) and then `apiSessionClient.expires` (:458), as
 *   now + 75% of sessionTimeoutSeconds (:438); smartContractAddress comes from
 *   _createKernelAccount (:492);
 * - resetClient (:158-180) clears those fields and every client;
 * - hasActiveSession (:186-199) reads `apiSessionClient.expires` and, with
 *   useWalletSession, `passkeySessionClient.expires` and `passkeyClient.valid`
 *   (:115-126), which a flagged passkey session never sets.
 */
class SessionKernelSigner extends KernelSigner {
  /** `passkeySub` marks a session a flagged passkey sign-in opened. */
  async openSessionWithApiStamper(
    subOrganizationId: string,
    apiStamper: ApiKeyStamper,
    passkeySub: string | null = null,
  ) {
    const generation = sessionGeneration();
    await super.openSessionWithApiStamper(subOrganizationId, apiStamper);
    if (generation !== sessionGeneration()) {
      // Reset or logged out while this was opening: leave no session behind.
      super.resetClient();
      throw new Error('Session ended while it was opening');
    }
    setSessionStamper(apiStamper, this.apiSessionClient.expires, passkeySub);
  }

  resetClient() {
    clearSessionStamper();
    return super.resetClient();
  }

  async getActiveClient() {
    const sub = getPasskeySessionSub();
    if (!passkeyRefresh && sub && this.apiSessionClient.expires <= Date.now()) {
      passkeyRefresh = initializePasskey(sub)
        .then(() => undefined)
        .finally(() => {
          passkeyRefresh = null;
        });
    }
    // Calls that overlap share one prompt, and wait for it to finish opening.
    if (passkeyRefresh) await passkeyRefresh;
    return super.getActiveClient();
  }
}

let kernelSigner: KernelSigner;

export type TurnkeySessionData =
  | {
      sessionType: 'api_key';
      embeddedKey: string;
      credentialBundle: string;
    }
  | { sessionType: 'passkey' };

export type TurnkeySessionDataWithExpiry = TurnkeySessionData & {
  expiresAt: number;
};

export const createKernelSigner = (
  clientId: string,
  domain: string,
  redirectUri: string,
): KernelSigner => {
  const kernelSignerConfig = newKernelConfig({
    rpcUrl: process.env.REACT_APP_POLYGON_RPC_URL!,
    bundlerUrl: process.env.REACT_APP_ZERODEV_BUNDLER_URL!,
    paymasterUrl: process.env.REACT_APP_ZERODEV_PAYMASTER_URL!,
    environment: process.env.REACT_APP_ENVIRONMENT,
    useWalletSession: true,
    clientId,
    domain,
    redirectUri,
  });

  kernelSigner = new SessionKernelSigner(kernelSignerConfig);
  return kernelSigner;
};

export const getKernelSigner = (): KernelSigner => {
  return kernelSigner;
};

export const getKernelSignerClient = async () => {
  return await withTimeout(
    kernelSigner.getActiveClient(),
    KERNEL_OP_TIMEOUT_MS,
    'getActiveClient',
  );
};

export const getSmartContractAddress = (): `0x${string}` | undefined => {
  return kernelSigner.kernelAddress;
};

export const getWalletAddress = (): `0x${string}` | undefined => {
  return kernelSigner.walletAddress;
};

/**
 * Makes a passkey on this device. `excludeCredentialIds` (base64url) are the
 * account's passkeys already: a device that holds one of them refuses with an
 * InvalidStateError instead of making a second.
 */
export const createPasskey = async (
  email: string,
  { excludeCredentialIds = [] }: { excludeCredentialIds?: string[] } = {},
): Promise<PasskeyCreationResult> => {
  const challenge = generateRandomBuffer();
  const authenticatorUserId = generateRandomBuffer();

  let authenticatorName = `${email} @ DIMO`;

  if (process.env.REACT_APP_ENVIRONMENT !== 'prod') {
    authenticatorName += ` preview`;
  }

  // An example of possible options can be found here:
  // https://www.w3.org/TR/webauthn-2/#sctn-sample-registration
  const attestation = await getWebAuthnAttestation({
    publicKey: {
      rp: {
        id: process.env.REACT_APP_RPCID_URL, //localhost, or dimo.org
        name: 'Dimo Passkey Wallet',
      },
      challenge,
      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7,
        },
      ],
      user: {
        id: authenticatorUserId,
        name: authenticatorName,
        displayName: authenticatorName,
      },
      authenticatorSelection: {
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'preferred',
      },
      // The vendored WebAuthn call passes options through: IDs must be bytes.
      ...(excludeCredentialIds.length > 0 && {
        excludeCredentials: excludeCredentialIds.map((id) => ({
          id: base64UrlToBytes(id),
          type: 'public-key' as const,
        })),
      }),
    },
  });

  return [attestation, base64UrlEncode(challenge)];
};

/**
 * Opens a Turnkey read-write session with one passkey stamp, the way
 * KernelSigner.passkeyToSession does (same activity, key and expiry), and
 * hands back its API-key stamper. The session's key lives in memory only.
 * Mirrors transactions src/KernelSigner.ts (0.4.1 and 0.5.0), passkeyToSession
 * :325-381: the fresh P-256 key (:328-330), the expiry as now + 75% of
 * `config.sessionTimeoutSeconds` (:331), the activity and its parameters
 * (:338-346) and the bundle decryption (:348-354); and it reads
 * `config.turnkeyApiBaseUrl` as the signer does. Check them on an SDK bump.
 */
export const createPasskeySession = async (
  subOrganizationId: string,
): Promise<{ stamper: ApiKeyStamper; expiresAt: number }> => {
  const { config } = kernelSigner;
  const timestamp = Date.now();
  const key = generateP256KeyPair();
  const expiresAt = timestamp + parseInt(config.sessionTimeoutSeconds) * 0.75 * 1000;

  const turnkeyClient = new TurnkeyClient(
    { baseUrl: config.turnkeyApiBaseUrl },
    passkeyStamper,
  );
  const sessionData = await turnkeyClient.createReadWriteSession({
    organizationId: subOrganizationId,
    type: 'ACTIVITY_TYPE_CREATE_READ_WRITE_SESSION_V2',
    timestampMs: timestamp.toString(),
    parameters: {
      targetPublicKey: key.publicKeyUncompressed,
      expirationSeconds: config.sessionTimeoutSeconds,
    },
  });
  const credentialBundle =
    sessionData.activity.result.createReadWriteSessionResultV2?.credentialBundle;
  if (!credentialBundle) {
    throw new Error('Turnkey returned no session credential');
  }
  return {
    stamper: getApiKeyStamper({ credentialBundle, embeddedKey: key.privateKey }),
    expiresAt,
  };
};

/**
 * Signs in with the passkey. Returns when the session ends (ms). With
 * ACCOUNTS_V2_SENDS on, the session is an API-key one (createPasskeySession)
 * the wallet signer opens with, so the v2 sends can use its stamper; off, the
 * wallet signer opens its own passkey session.
 */
export const initializePasskey = async (subOrganizationId: string): Promise<number> => {
  if (!accountsV2SendsEnabled()) {
    await kernelSigner.passkeyToSession(subOrganizationId, passkeyStamper);
    return kernelSigner.passkeySessionClient.expires;
  }
  const generation = sessionGeneration();
  const { stamper, expiresAt } = await createPasskeySession(subOrganizationId);
  if (generation !== sessionGeneration()) {
    // Reset or logged out while the prompt was open: open nothing.
    throw new Error('Session ended before the passkey session opened');
  }
  await (kernelSigner as SessionKernelSigner).openSessionWithApiStamper(
    subOrganizationId,
    stamper,
    subOrganizationId,
  );
  return expiresAt;
};

/**
 * With ACCOUNTS_V2_SENDS on: whether the account's passkey session has less
 * than SEND_MARGIN_MS left. validateSession then renews it (initializePasskey,
 * one prompt), so neither stack sends on a session that can end midway: the
 * wallet signer reads its client again for the receipt, and a lapse there
 * prompts for a passkey after the operation was sent.
 */
export const passkeySessionEndsSoon = (subOrganizationId: string): boolean =>
  accountsV2SendsEnabled() &&
  getPasskeySessionSub() === subOrganizationId &&
  (getSessionStamperExpiry() ?? 0) - Date.now() < SEND_MARGIN_MS;

export const getApiKeyStamper = (args: {
  credentialBundle: string;
  embeddedKey: string;
}) => {
  // @turnkey/crypto 2.x renamed `decryptBundle` (returned a Uint8Array private
  // key) to `decryptCredentialBundle`, which returns the private key as a hex
  // string. getPublicKey accepts the hex string directly, and the stamper takes
  // the hex private key as-is.
  const privateKey = decryptCredentialBundle(args.credentialBundle, args.embeddedKey);
  const publicKey = uint8ArrayToHexString(getPublicKey(privateKey, true));
  return new ApiKeyStamper({
    apiPublicKey: publicKey,
    apiPrivateKey: privateKey,
  });
};

export const signChallenge = async (challenge: string): Promise<`0x${string}`> => {
  //This is triggering a turnkey API request to sign a raw payload
  //Notes on signature, turnkey api returns an ecdsa signature, which the kernel client is handling
  const signature = await withTimeout(
    kernelSigner.signChallenge(challenge),
    KERNEL_OP_TIMEOUT_MS,
    'signChallenge',
  );

  return signature;
};

type IpfsSourceOptions = {
  attachments?: Attachment[];
  cloudEventAgreements?: CloudEventAgreement[];
  dataversion?: string;
  // The vehicle's DID (did:erc721:<chainId>:<contract>:<tokenId>). File
  // agreements only count for the vehicle they name, so one document can't
  // cover several vehicles; a bulk share without files keeps the 'did:'
  // placeholder.
  asset?: `did:${string}`;
};

// Helper function to generate IPFS sources for one or more vehicles
export const generateIpfsSources = async (
  permissions: Permission[],
  clientId: `0x${string}` | null,
  expiration: BigInt,
  { attachments = [], cloudEventAgreements, dataversion, asset = 'did:' }: IpfsSourceOptions = {},
): Promise<string> => {
  const grantor = kernelSigner.smartContractAddress!;
  const ipfsRes = await withTimeout(
    kernelSigner.signAndUploadSACDAgreement({
      expiration: expiration,
      permissions: permissions,
      grantee: clientId as `0x${string}`,
      attachments: attachments,
      grantor,
      asset,
      ...(cloudEventAgreements?.length && {
        // Whose files are shared: the grantor's, unless the app said otherwise.
        cloudEventAgreements: cloudEventAgreements.map((agreement) => ({
          ...agreement,
          source: agreement.source || grantor,
        })),
      }),
      ...(dataversion && { dataversion }),
    }),
    KERNEL_OP_TIMEOUT_MS,
    'signAndUploadSACDAgreement',
  );

  return `ipfs://${ipfsRes.cid}`;
};

// Account-level SACD source: grants document cloudevents on the user's account
// DID (did:ethr:<chainId>:<grantor>), not on a vehicle. Mirrors generateIpfsSources
// but carries the driver-document agreements and the correct account asset DID.
export const generateAccountIpfsSource = async (
  permissions: Permission[],
  clientId: `0x${string}` | null,
  expiration: BigInt,
): Promise<string> => {
  const grantor = kernelSigner.smartContractAddress!;
  // Use the signer's actual chain (polygon=137 in prod, polygonAmoy=80002 in dev)
  // so the asset DID matches the chain the grant is executed on — hardcoding 137
  // orphaned the grant on non-prod environments.
  const chainId = kernelSigner.chain.id;
  const ipfsRes = await withTimeout(
    kernelSigner.signAndUploadSACDAgreement({
      expiration,
      permissions,
      grantee: clientId as `0x${string}`,
      attachments: [],
      grantor,
      asset: `did:ethr:${chainId}:${grantor}`,
      cloudEventAgreements: buildDriverDocAgreements(grantor),
    }),
    KERNEL_OP_TIMEOUT_MS,
    'signAndUploadSACDAgreement(account)',
  );
  return `ipfs://${ipfsRes.cid}`;
};

// KernelSigner rejects batches of 25 or more grants.
export const VEHICLE_PERMISSIONS_BATCH_LIMIT = 24;

/**
 * Reports a v2 send error that names its UserOperation (unknown, pending or
 * reverted) with the operation's hash and gas provider as its user_operation
 * context. Sentry sends an error once, so the screen's own captureException
 * of it adds no second event.
 */
const reportUserOperation = (error: unknown) => {
  if (
    error instanceof UserOperationUnknownError ||
    error instanceof UserOperationPendingError ||
    error instanceof UserOperationRevertedError
  ) {
    const { userOpHash, provider } = error;
    captureException(error, { contexts: { user_operation: { userOpHash, provider } } });
  } else if (error instanceof V2SendTimeoutError) {
    // Unknown too, before any operation was named.
    captureException(error, {
      contexts: { user_operation: { userOpHash: null, provider: null } },
    });
  }
};

/**
 * Sends the calls through accounts v2 when it can serve the signed-in account
 * (ACCOUNTS_V2_SENDS), then runs `finish` on the transaction hash and returns
 * what it gives. Null when v2 can't: nothing was sent, and the caller sends
 * through the wallet signer as before. With the flag on, the calls are built
 * first, so a malformed request fails before any sign-in or claim; off, they
 * aren't built at all.
 * Once sendCallsV2 has started, its errors propagate and nothing is sent
 * again, through v2 or the wallet signer: after a UserOperationUnknownError or
 * UserOperationPendingError the operation may still land. The send and
 * `finish` together get V2_SEND_TIMEOUT_MS, then fail as pending (as
 * UserOperationPendingError once the operation is named, V2SendTimeoutError
 * before), never falling back.
 */
const sendThroughV2 = async <T>(
  buildCalls: () => V2Call[],
  finish: (transactionHash: Hex) => Promise<T>,
): Promise<T | null> => {
  const calls = accountsV2SendsEnabled() ? buildCalls() : [];
  const v2 = await ensureV2Session({
    // The account the wallet signer has a session for. Empty only without a
    // session, which ensureV2Session turns down.
    subOrganizationId: kernelSigner.subOrganizationId ?? '',
    walletAddress: kernelSigner.walletAddress,
    smartContractAddress: kernelSigner.smartContractAddress,
  });
  if (v2.kind === 'unavailable') {
    // Sentry keeps it as a console breadcrumb; it is no error of its own.
    if (v2.reason !== 'flag_off') {
      console.info(
        `Sent through the wallet signer: accounts v2 unavailable (${v2.reason})`,
      );
    }
    return null;
  }
  let sent: { userOpHash: Hex; provider: string } | undefined;
  const sending = (async () => {
    const transactionHash = await sendCallsV2(v2, calls, (op) => {
      sent = op;
    });
    // Its counterpart is the wallet signer line above; no Sentry event either.
    console.info(
      `Sent through accounts v2: UserOperation ${sent?.userOpHash} via ${sent?.provider}`,
    );
    return finish(transactionHash);
  })();
  // A send still running at the time limit goes on; its outcome is dropped.
  sending.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          sent
            ? new UserOperationPendingError(
                sent.userOpHash,
                sent.provider,
                `no answer within ${V2_SEND_TIMEOUT_MS} ms`,
              )
            : new V2SendTimeoutError(),
        ),
      V2_SEND_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([sending, timedOut]);
  } catch (error) {
    reportUserOperation(error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

/** For a wrapper whose caller needs only the transaction hash. */
const hashOnly = async (transactionHash: Hex) => transactionHash;

/** The wallet signer's environment, so v2 sends to the same SACD contracts. */
const environment = () => kernelSigner.config.environment;

/** A contract call as a UserOperation call, encoded as the wallet signer encodes it. */
const encodeCall = ({
  address,
  abi,
  functionName,
  args,
  value,
}: TransactionData): V2Call => ({
  to: address,
  value: (value || BigInt(0)) as bigint,
  data: encodeFunctionData({ abi, functionName, args }),
});

/** A v2 send's transaction logs, from the chain, as the wallet signer's receipt carries them. */
const transactionLogs = async (hash: Hex) =>
  (
    await kernelSigner.publicClient.waitForTransactionReceipt({
      hash,
      timeout: KERNEL_OP_TIMEOUT_MS,
    })
  ).logs;

/** The hash and its logs. Reading the logs fails the call: a caller needs them. */
const withLogs = async (transactionHash: Hex) => ({
  transactionHash,
  logs: await transactionLogs(transactionHash),
});

/**
 * The hash and its logs, or no logs when they can't be read: the operation has
 * landed, and no batch caller reads them, so failing would only invite a resend.
 */
const withLogsIfReadable = async (transactionHash: Hex) => {
  try {
    return await withLogs(transactionHash);
  } catch (error) {
    // A breadcrumb in Sentry; no event of its own.
    console.warn(`Could not read the logs of v2 transaction ${transactionHash}`, error);
    return { transactionHash, logs: [] };
  }
};

// Sets a different grant (and source document) per vehicle in one user
// operation, so either every grant in the batch lands or none does.
export async function setVehiclePermissionsBatch(
  grants: SetVehiclePermissions[],
): Promise<void> {
  try {
    const v2Hash = await sendThroughV2(
      () => vehiclePermissionsCalls(grants, environment()),
      hashOnly,
    );
    if (v2Hash === null) {
      await withTimeout(
        kernelSigner.setVehiclePermissions(grants),
        KERNEL_OP_TIMEOUT_MS,
        'setVehiclePermissionsBatch',
      );
    }
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

// Define the bridge function in your Turnkey Service
export async function setVehiclePermissions({
  tokenId,
  grantee,
  permissions,
  expiration,
  source,
}: SetVehiclePermissions): Promise<void> {
  const grant = { tokenId, grantee, permissions, expiration, source };
  try {
    const v2Hash = await sendThroughV2(
      () => vehiclePermissionsCalls(grant, environment()),
      hashOnly,
    );
    if (v2Hash === null) {
      // Call the kernelClient's setVehiclePermissions with the prepared payload
      await withTimeout(
        kernelSigner.setVehiclePermissions(grant),
        KERNEL_OP_TIMEOUT_MS,
        'setVehiclePermissions',
      );
    }
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

export async function setVehiclePermissionsBulk({
  tokenIds,
  grantee,
  permissions,
  expiration,
  source,
}: SetVehiclePermissionsBulk): Promise<void> {
  const grant = { tokenIds, grantee, permissions, expiration, source };
  try {
    const v2Hash = await sendThroughV2(
      () => vehiclePermissionsBulkCalls(grant, environment()),
      hashOnly,
    );
    if (v2Hash === null) {
      // Call the kernelClient's setVehiclePermissionsBulk with the prepared payload
      await withTimeout(
        kernelSigner.setVehiclePermissionsBulk(grant),
        KERNEL_OP_TIMEOUT_MS,
        'setVehiclePermissionsBulk',
      );
    }
    console.log('Vehicle permissions set successfully');
  } catch (error) {
    console.error('Error setting vehicle permissions:', error);
    throw error;
  }
}

// Account-level SACD grant bridge. templateId is required by the SDK type
// (callers pass 0n for the explicit-permissions + cloudEventAgreements path).
export async function setAccountPermissions({
  grantee,
  permissions,
  expiration,
  templateId,
  source,
}: SetAccountPermissions): Promise<void> {
  const grant = { grantee, permissions, expiration, templateId, source };
  try {
    const v2Hash = await sendThroughV2(
      () => accountPermissionsCalls(grant, environment()),
      hashOnly,
    );
    if (v2Hash === null) {
      await withTimeout(
        kernelSigner.setAccountPermissions(grant),
        KERNEL_OP_TIMEOUT_MS,
        'setAccountPermissions',
      );
    }
    console.log('Account permissions set successfully');
  } catch (error) {
    console.error('Error setting account permissions:', error);
    throw error;
  }
}

// Parse the bigint values
function parseParameters(rawValues: string[]): (string | bigint)[] {
  return rawValues.map((v) => {
    if (/^-?\d+$/.test(v)) {
      return BigInt(v);
    }
    return v;
  });
}

function parseValue(rawValue?: bigint): BigInt {
  if (!rawValue) return BigInt(0);
  return BigInt(rawValue);
}

export async function signArbitraryMessage(
  message: string,
  isHex: boolean,
): Promise<{ signature: `0x${string}`; signer: `0x${string}` }> {
  const signer = kernelSigner.kernelAddress;
  if (!signer) {
    throw new Error('Kernel address unavailable; user is not authenticated.');
  }

  let signature: `0x${string}`;
  if (isHex) {
    const client = await withTimeout(
      kernelSigner.getActiveClient(),
      KERNEL_OP_TIMEOUT_MS,
      'getActiveClient',
    );
    signature = await withTimeout(
      client.signMessage({ message: { raw: message as `0x${string}` } }),
      KERNEL_OP_TIMEOUT_MS,
      'signMessage',
    );
  } else {
    signature = await withTimeout(
      kernelSigner.signChallenge(message),
      KERNEL_OP_TIMEOUT_MS,
      'signChallenge',
    );
  }

  return { signature, signer };
}

export async function executeAdvancedTransaction(
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args: any[],
  value?: bigint,
): Promise<`0x${string}`> {
  const data = {
    address: address,
    value: parseValue(value!),
    abi: abi,
    functionName: functionName,
    args: parseParameters(args),
  };
  const v2Hash = await sendThroughV2(() => [encodeCall(data)], hashOnly);
  if (v2Hash !== null) return v2Hash;

  const response = await withTimeout(
    kernelSigner.executeTransaction({
      requireSignature: false,
      data,
    }),
    KERNEL_OP_TIMEOUT_MS,
    'executeTransaction',
  );

  return response.receipt.transactionHash;
}

export async function executeTransactionWithReceipt(
  address: `0x${string}`,
  abi: any,
  functionName: string,
  args: any[],
): Promise<{ transactionHash: `0x${string}`; logs: any[] }> {
  const data = { address, abi, functionName, args };
  // ProvisionDeveloperLicense needs the logs (its Issued event): no logs fails it.
  const v2 = await sendThroughV2(() => [encodeCall(data)], withLogs);
  if (v2 !== null) return v2;

  const receipt = await withTimeout(
    kernelSigner.executeTransaction({
      requireSignature: false,
      data,
    }),
    KERNEL_OP_TIMEOUT_MS,
    'executeTransactionWithReceipt',
  );
  const logs = receipt.receipt?.logs?.length ? receipt.receipt.logs : (receipt as any).logs ?? [];
  return { transactionHash: receipt.receipt.transactionHash, logs };
}

export function getSacdDescription(args: VehiclePermissionDescription): string {
  return sacdDescription(args);
}

export async function executeBatchTransactions(
  calls: Array<{ address: `0x${string}`; abi: any; functionName: string; args: any[]; value?: BigInt }>,
): Promise<{ transactionHash: `0x${string}`; logs: any[] }> {
  const data = calls.map(({ address, abi, functionName, args, value }) => ({
    address,
    abi,
    functionName,
    args,
    ...(value !== undefined && { value }),
  }));
  const v2 = await sendThroughV2(() => data.map(encodeCall), withLogsIfReadable);
  if (v2 !== null) return v2;

  const receipt = await withTimeout(
    kernelSigner.executeTransaction({
      requireSignature: false,
      data,
    }),
    KERNEL_OP_TIMEOUT_MS,
    'executeBatchTransactions',
  );
  const logs = receipt.receipt?.logs?.length ? receipt.receipt.logs : (receipt as any).logs ?? [];
  return { transactionHash: receipt.receipt.transactionHash, logs };
}
