/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
/**
 * The accounts v2 client. The SDK's calls are stand-ins and its error classes
 * the real ones; the session stamper is the real module, holding a stand-in.
 */
const turnkey = vi.hoisted(() => ({
  clients: [] as Array<{ config: unknown; stamper: unknown }>,
}));

vi.mock('@dimo-network/transactions/accounts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dimo-network/transactions/accounts')>()),
  claimDid: vi.fn(),
  generateDpopKey: vi.fn(),
  getMe: vi.fn(),
  lookupByWallet: vi.fn(),
  removePhone: vi.fn(),
  sendUserOperation: vi.fn(),
  signIn: vi.fn(),
  smartAccountAddress: vi.fn(),
  turnkeyWalletDidKey: vi.fn(),
  waitForUserOperationReceipt: vi.fn(),
}));
vi.mock('@turnkey/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@turnkey/http')>()),
  TurnkeyClient: class {
    constructor(
      public config: unknown,
      public stamper: unknown,
    ) {
      turnkey.clients.push(this);
    }
  },
}));
vi.mock('@turnkey/viem', () => ({ createAccount: vi.fn() }));
vi.mock('../../turnkeyService', () => ({
  getKernelSigner: () => ({
    config: { turnkeyApiBaseUrl: 'https://api.turnkey.example' },
  }),
}));

import {
  AccountsError,
  claimDid,
  DirectoryUnavailableError,
  generateDpopKey,
  getMe,
  lookupByWallet,
  NetworkError,
  RemovePhoneFirstError,
  removePhone,
  sendUserOperation,
  signIn,
  SigninError,
  smartAccountAddress,
  TurnkeyWalletSigner,
  turnkeyWalletDidKey,
  UnexpectedDidStateError,
  UserOperationPendingError,
  UserOperationRevertedError,
  UserOperationUnknownError,
  waitForUserOperationReceipt,
  type AccountView,
  type SdkConfig,
  type Session,
  type WebCryptoDpopKey,
} from '@dimo-network/transactions/accounts';
import type { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { createAccount } from '@turnkey/viem';
import type { Hex, LocalAccount } from 'viem';

import { clearSessionStamper, setSessionStamper } from '../../sessionStamper';
import { ensureV2Session, sendCallsV2, v2Config, type V2Ready } from '../accountsV2';

const ENV = {
  REACT_APP_ACCOUNTS_V2_SENDS: 'true',
  REACT_APP_ENVIRONMENT: 'dev',
  REACT_APP_DIMO_ACCOUNTS_URL: 'https://accounts.dev.dimo.org/api',
  REACT_APP_DAUTH_URL: 'https://dauth.dev.dimo.zone',
  REACT_APP_DID_DIRECTORY_URL: 'https://did.dev.dimo.zone',
  REACT_APP_TURNKEY_PARENT_ORG_ID: 'parent-org',
  REACT_APP_POLYGON_RPC_URL: 'https://rpc.example/amoy',
};
const REQUIRED_ENV = [
  'REACT_APP_DIMO_ACCOUNTS_URL',
  'REACT_APP_DAUTH_URL',
  'REACT_APP_DID_DIRECTORY_URL',
  'REACT_APP_TURNKEY_PARENT_ORG_ID',
  'REACT_APP_POLYGON_RPC_URL',
] as const;

const WALLET: Hex = '0x1111111111111111111111111111111111111111';
// The plain kernel, checksummed as the SDK returns it.
const KERNEL: Hex = '0xAbCdEf000000000000000000000000000000AbCd';
const DID = 'did:dimo:aaaaaaaaaaaaaaaaaaaaaaaa';
const WALLET_DID_KEY = 'did:key:zQ3shWallet';
const HOUR = 3_600_000;
const TOKEN_LIFETIME = 900_000;

const JUN = {
  subOrganizationId: 'sub-jun',
  walletAddress: WALLET,
  smartContractAddress: KERNEL.toLowerCase() as Hex,
};

const walletAccount = { address: WALLET, type: 'local' } as unknown as LocalAccount;
const CLAIMED_DID = 'did:dimo:claimedclaimedclaimedcla';
/** The account accounts v2 records: its wallet, and its kernel as the smart account. */
const accountView = (over: Partial<AccountView> = {}): AccountView => ({
  did: DID,
  email: 'jun@x.co',
  emailVerified: true,
  subOrganizationId: 'sub-jun',
  walletAddress: WALLET,
  smartAccount: { address: KERNEL.toLowerCase(), chain: 'POLYGON' },
  ...over,
});
const dpopKey = { keyPair: {} } as unknown as WebCryptoDpopKey;
const dauthSession = (did = DID): Session => ({
  did,
  token: 'token',
  expiresAt: new Date(Date.now() + TOKEN_LIFETIME),
  dpopKey,
  scopes: ['read', 'write'],
});

const sdkCalls = () => [
  claimDid,
  generateDpopKey,
  getMe,
  lookupByWallet,
  removePhone,
  sendUserOperation,
  signIn,
  smartAccountAddress,
  turnkeyWalletDidKey,
  waitForUserOperationReceipt,
  createAccount,
];

/** A fetch that never answers, and rejects when its request is aborted, as fetch does. */
const fetchThatHangs = () =>
  vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      }),
  );

/** A request the way the SDK sends one: a rejected fetch is a NetworkError. */
const sdkRequest = async (cfg: Pick<SdkConfig, 'fetchImpl'>, url: string) => {
  try {
    return await cfg.fetchImpl!(url, { method: 'POST' });
  } catch (cause) {
    throw new NetworkError('dauth', cause);
  }
};

/** A new Turnkey session for the signed-in account, as a sign-in opens one. */
const openTurnkeySession = (expiresIn = HOUR) => {
  const stamper = { stamp: vi.fn() } as unknown as ApiKeyStamper;
  setSessionStamper(stamper, Date.now() + expiresIn);
  return stamper;
};

let stamper: ApiKeyStamper;

beforeEach(() => {
  Object.assign(process.env, ENV);
  turnkey.clients = [];
  localStorage.clear();
  sessionStorage.clear();
  stamper = openTurnkeySession();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.mocked(createAccount).mockResolvedValue(walletAccount);
  vi.mocked(smartAccountAddress).mockResolvedValue(KERNEL);
  vi.mocked(turnkeyWalletDidKey).mockResolvedValue(WALLET_DID_KEY);
  vi.mocked(generateDpopKey).mockResolvedValue(dpopKey);
  vi.mocked(lookupByWallet).mockResolvedValue(DID);
  vi.mocked(signIn).mockImplementation(async () => dauthSession());
  vi.mocked(getMe).mockImplementation(async () => accountView());
  vi.mocked(claimDid).mockImplementation(async () => ({
    did: CLAIMED_DID,
    session: dauthSession(CLAIMED_DID),
    account: accountView({ did: CLAIMED_DID }),
  }));
});
afterEach(() => {
  clearSessionStamper();
  Object.keys(ENV).forEach((key) => delete process.env[key]);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('v2Config', () => {
  it('reads the accounts origin, dauth, the directory, the parent org and the dev chain', () => {
    expect(v2Config()).toEqual({
      accountsUrl: 'https://accounts.dev.dimo.org',
      dauthUrl: 'https://dauth.dev.dimo.zone',
      directoryUrl: 'https://did.dev.dimo.zone',
      turnkeyParentOrgId: 'parent-org',
      rpcUrls: { 80002: 'https://rpc.example/amoy' },
    });
  });

  it('puts the RPC on Polygon mainnet in prod', () => {
    process.env.REACT_APP_ENVIRONMENT = 'prod';
    expect(v2Config().rpcUrls).toEqual({ 137: 'https://rpc.example/amoy' });
  });
});

describe('ensureV2Session', () => {
  it('is flag_off with ACCOUNTS_V2_SENDS off, and calls nothing', async () => {
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'false';

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'flag_off',
    });
    sdkCalls().forEach((call) => expect(call).not.toHaveBeenCalled());
    expect(turnkey.clients).toEqual([]);
  });

  it.each(REQUIRED_ENV)('is config_missing without %s', async (name) => {
    delete process.env[name];

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'config_missing',
    });
    sdkCalls().forEach((call) => expect(call).not.toHaveBeenCalled());
  });

  it('is config_missing when the accounts URL is not a URL', async () => {
    process.env.REACT_APP_DIMO_ACCOUNTS_URL = 'accounts';

    expect(await ensureV2Session(JUN)).toMatchObject({ reason: 'config_missing' });
  });

  it('is no_session without a Turnkey session, or once it has expired', async () => {
    clearSessionStamper();
    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'no_session',
    });

    openTurnkeySession(-1);
    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'no_session',
    });
    sdkCalls().forEach((call) => expect(call).not.toHaveBeenCalled());
  });

  it('signs for the wallet with the session stamper, on the KernelSigner Turnkey API', async () => {
    const ready = await ensureV2Session(JUN);

    expect(turnkey.clients).toEqual([
      { config: { baseUrl: 'https://api.turnkey.example' }, stamper },
    ]);
    const [client] = turnkey.clients;
    expect(createAccount).toHaveBeenCalledWith({
      client,
      organizationId: 'sub-jun',
      signWith: WALLET,
    });
    expect(turnkeyWalletDidKey).toHaveBeenCalledWith(client, 'sub-jun', WALLET);
    expect(ready).toMatchObject({ kind: 'ready', walletAccount, chainId: 80002 });
  });

  it('checks the plain kernel on Polygon mainnet in prod', async () => {
    process.env.REACT_APP_ENVIRONMENT = 'prod';

    expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready', chainId: 137 });
    expect(smartAccountAddress).toHaveBeenCalledWith(
      expect.objectContaining({ rpcUrls: { 137: 'https://rpc.example/amoy' } }),
      { walletViemAccount: walletAccount, chainId: 137 },
    );
  });

  it('matches the plain kernel to the smart account whatever the letter case', async () => {
    expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });
  });

  it('is address_mismatch when the smart account is not the plain kernel, and claims nothing', async () => {
    vi.mocked(lookupByWallet).mockResolvedValue(null);
    const coSignerKernel: Hex = '0x2222222222222222222222222222222222222222';

    expect(
      await ensureV2Session({ ...JUN, smartContractAddress: coSignerKernel }),
    ).toEqual({
      kind: 'unavailable',
      reason: 'address_mismatch',
    });
    expect(claimDid).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it.each([
    ['a smart account', { smartContractAddress: null }],
    ['a wallet', { walletAddress: null }],
  ])('is address_mismatch for an account without %s', async (_name, missing) => {
    expect(await ensureV2Session({ ...JUN, ...missing })).toEqual({
      kind: 'unavailable',
      reason: 'address_mismatch',
    });
    expect(claimDid).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in with the wallet key when the wallet has a DID', async () => {
    const ready = await ensureV2Session(JUN);

    expect(lookupByWallet).toHaveBeenCalledWith(expect.anything(), { address: WALLET });
    expect(signIn).toHaveBeenCalledTimes(1);
    const [cfg, args] = vi.mocked(signIn).mock.calls[0];
    expect(cfg).toEqual({ ...v2Config(), fetchImpl: expect.any(Function) });
    expect(args).toEqual({
      did: DID,
      signer: expect.any(TurnkeyWalletSigner),
      fragment: 'wallet',
      scope: ['read', 'write'],
      dpopKey,
    });
    expect(args.signer.didKey).toBe(WALLET_DID_KEY);
    expect(claimDid).not.toHaveBeenCalled();
    expect(ready).toMatchObject({ kind: 'ready', session: { did: DID } });
  });

  it('claims a wallet-only DID when the wallet has none, and uses its session', async () => {
    vi.mocked(lookupByWallet).mockResolvedValue(null);

    const ready = await ensureV2Session(JUN);

    expect(claimDid).toHaveBeenCalledTimes(1);
    const [, args] = vi.mocked(claimDid).mock.calls[0];
    expect(args).toEqual({ wallet: expect.any(TurnkeyWalletSigner), dpopKey });
    expect(args).not.toHaveProperty('signingKey');
    expect(signIn).not.toHaveBeenCalled();
    expect(removePhone).not.toHaveBeenCalled();
    expect(ready).toMatchObject({
      kind: 'ready',
      session: { did: 'did:dimo:claimedclaimedclaimedcla' },
    });
  });

  it('is claim_refused when the claim asks for the phone number to go first, and leaves the phone', async () => {
    vi.mocked(lookupByWallet).mockResolvedValue(null);
    vi.mocked(claimDid).mockRejectedValue(
      new RemovePhoneFirstError(409, 'remove the phone number first'),
    );

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'claim_refused',
    });
    expect(claimDid).toHaveBeenCalledTimes(1);
    expect(removePhone).not.toHaveBeenCalled();
  });

  it.each([
    [
      'an unexpected DID state',
      () =>
        new UnexpectedDidStateError(DID, {
          unexpectedKeys: { device: 'did:key:zDnaePlanted' },
          rotationKeys: [WALLET_DID_KEY],
          operations: 2,
        }),
    ],
    [
      'an accounts conflict',
      () => new AccountsError('conflict', 409, 'claim in progress'),
    ],
  ])('is claim_refused on %s from the claim', async (_name, refusal) => {
    vi.mocked(lookupByWallet).mockResolvedValue(null);
    vi.mocked(claimDid).mockRejectedValue(refusal());

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'claim_refused',
    });
    expect(claimDid).toHaveBeenCalledTimes(1);
    expect(removePhone).not.toHaveBeenCalled();
  });

  it.each([
    [
      'the directory is unavailable',
      () => new DirectoryUnavailableError('directory 503', 503),
    ],
    ['accounts answers 503', () => new AccountsError('unavailable', 503, 'down')],
    ['dauth answers 503', () => new SigninError('unavailable', 'try later', 503)],
    ['dauth cannot be reached', () => new NetworkError('dauth', new TypeError('fetch'))],
  ])('is v2_down when the claim gets no answer because %s', async (_name, failure) => {
    vi.mocked(lookupByWallet).mockResolvedValue(null);
    vi.mocked(claimDid).mockRejectedValue(failure());

    expect(await ensureV2Session(JUN)).toMatchObject({ reason: 'v2_down' });
  });

  it.each([
    [
      'the directory is unavailable',
      () => new DirectoryUnavailableError('directory 503', 503),
    ],
    ['dauth answers 503', () => new SigninError('unavailable', 'try later', 503)],
    ['dauth cannot be reached', () => new NetworkError('dauth', new TypeError('fetch'))],
  ])('is v2_down when signIn fails because %s', async (_name, failure) => {
    vi.mocked(signIn).mockRejectedValue(failure());

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'v2_down',
    });
  });

  it.each([
    [
      'accounts cannot be reached',
      () => new NetworkError('accounts', new TypeError('fetch')),
    ],
    ['accounts answers 503', () => new AccountsError('unavailable', 503, 'down')],
  ])('is v2_down when the wallet lookup fails because %s', async (_name, failure) => {
    vi.mocked(lookupByWallet).mockRejectedValue(failure());

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'v2_down',
    });
    expect(claimDid).not.toHaveBeenCalled();
  });

  it('is v2_down, and logs why, when the kernel address cannot be read', async () => {
    const failure = new Error('RPC unreachable');
    vi.mocked(smartAccountAddress).mockRejectedValue(failure);

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'v2_down',
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('v2_down'),
      failure,
    );
  });

  describe('the sender the gas proxy takes for the account', () => {
    it('is ready when the account records the kernel on Polygon, read with the signed-in session', async () => {
      const ready = await ensureV2Session(JUN);

      expect(ready).toMatchObject({ kind: 'ready', session: { did: DID } });
      expect(getMe).toHaveBeenCalledTimes(1);
      const [cfg, args] = vi.mocked(getMe).mock.calls[0];
      // The same bounded cfg as the sign-in: getMe counts in the 20 s budget.
      expect(cfg).toBe(vi.mocked(signIn).mock.calls[0][0]);
      expect(args).toEqual({ session: (ready as V2Ready).session });
    });

    it('is address_mismatch when the account records another smart account, and sends nothing', async () => {
      vi.mocked(getMe).mockResolvedValue(
        accountView({
          smartAccount: {
            address: '0x2222222222222222222222222222222222222222',
            chain: 'POLYGON',
          },
        }),
      );

      expect(await ensureV2Session(JUN)).toEqual({
        kind: 'unavailable',
        reason: 'address_mismatch',
      });
      expect(sendUserOperation).not.toHaveBeenCalled();
      expect(waitForUserOperationReceipt).not.toHaveBeenCalled();
    });

    it('is address_mismatch when accounts has no account for the DID', async () => {
      vi.mocked(getMe).mockResolvedValue(null);

      expect(await ensureV2Session(JUN)).toEqual({
        kind: 'unavailable',
        reason: 'address_mismatch',
      });
    });

    it('keeps nothing after a mismatch: the next call reads the account again', async () => {
      vi.mocked(getMe).mockResolvedValueOnce(null);
      expect(await ensureV2Session(JUN)).toMatchObject({ reason: 'address_mismatch' });

      expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });
      expect(getMe).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['no smart account', { smartAccount: null }],
      [
        'a smart account on another chain',
        {
          smartAccount: {
            address: '0x2222222222222222222222222222222222222222',
            chain: 'BASE' as const,
          },
        },
      ],
    ])(
      'with %s recorded, takes the plain kernel of the recorded wallet, as the proxy does',
      async (_name, over) => {
        vi.mocked(getMe).mockResolvedValue(
          accountView({
            ...over,
            walletAddress: WALLET.toUpperCase().replace('0X', '0x'),
          }),
        );
        expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });

        vi.mocked(getMe).mockResolvedValue(
          accountView({
            ...over,
            walletAddress: '0x3333333333333333333333333333333333333333',
          }),
        );
        expect(
          await ensureV2Session({ ...JUN, subOrganizationId: 'sub-jun-again' }),
        ).toEqual({ kind: 'unavailable', reason: 'address_mismatch' });
      },
    );

    it.each([
      [401, 'unauthorized'],
      [403, 'forbidden'],
    ])('is v2_down when reading the account answers %i', async (status, code) => {
      vi.mocked(getMe).mockRejectedValue(new AccountsError(code, status, 'no'));

      expect(await ensureV2Session(JUN)).toEqual({
        kind: 'unavailable',
        reason: 'v2_down',
      });
    });

    it('does not read the account again for a cached session', async () => {
      await ensureV2Session(JUN);
      await ensureV2Session(JUN);

      expect(signIn).toHaveBeenCalledTimes(1);
      expect(getMe).toHaveBeenCalledTimes(1);
    });

    it('takes the account a claim returns, without reading it again', async () => {
      vi.mocked(lookupByWallet).mockResolvedValue(null);

      expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });
      expect(getMe).not.toHaveBeenCalled();
    });

    it('is address_mismatch when the claimed account records another smart account', async () => {
      vi.mocked(lookupByWallet).mockResolvedValue(null);
      vi.mocked(claimDid).mockImplementation(async () => ({
        did: CLAIMED_DID,
        session: dauthSession(CLAIMED_DID),
        account: accountView({
          did: CLAIMED_DID,
          smartAccount: {
            address: '0x2222222222222222222222222222222222222222',
            chain: 'POLYGON',
          },
        }),
      }));

      expect(await ensureV2Session(JUN)).toEqual({
        kind: 'unavailable',
        reason: 'address_mismatch',
      });
    });
  });

  it('keeps the session until 180 s before it expires, then signs in again', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-27T12:00:00Z') });
    stamper = openTurnkeySession();

    const first = await ensureV2Session(JUN);
    vi.setSystemTime(Date.now() + TOKEN_LIFETIME - 181_000);
    expect(await ensureV2Session(JUN)).toBe(first);
    expect(signIn).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 2_000); // expiresAt - 179 s
    const renewed = await ensureV2Session(JUN);
    expect(signIn).toHaveBeenCalledTimes(2);
    expect(renewed).not.toBe(first);
  });

  it('makes one DPoP key per session, and stores nothing', async () => {
    await ensureV2Session(JUN);
    await ensureV2Session(JUN);

    expect(generateDpopKey).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('never gives one account the session of another', async () => {
    await ensureV2Session(JUN);
    const ready = await ensureV2Session({ ...JUN, subOrganizationId: 'sub-other' });

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(createAccount).toHaveBeenLastCalledWith(
      expect.objectContaining({ organizationId: 'sub-other' }),
    );
    expect(ready).toMatchObject({ kind: 'ready' });
  });

  it('drops the session once there is no Turnkey session', async () => {
    await ensureV2Session(JUN);
    clearSessionStamper();
    expect(await ensureV2Session(JUN)).toMatchObject({ reason: 'no_session' });

    // The same stamper back (it never is after a sign-in) still signs in again.
    setSessionStamper(stamper, Date.now() + HOUR);
    await ensureV2Session(JUN);
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it('signs in again with a new Turnkey session, with its stamper', async () => {
    await ensureV2Session(JUN);
    const renewed = openTurnkeySession();

    await ensureV2Session(JUN);

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(turnkey.clients.map((client) => client.stamper)).toEqual([stamper, renewed]);
  });

  it('is no_session when the Turnkey session ends while it signs in, and keeps nothing', async () => {
    vi.mocked(signIn).mockImplementationOnce(async () => {
      clearSessionStamper(); // logout
      return dauthSession();
    });

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'no_session',
    });

    setSessionStamper(stamper, Date.now() + HOUR);
    await ensureV2Session(JUN);
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it('is no_session when the Turnkey session has less than 180 s left, and signs nothing in', async () => {
    openTurnkeySession(100_000);

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'no_session',
    });
    sdkCalls().forEach((call) => expect(call).not.toHaveBeenCalled());
  });

  it('stops using a ready session once its Turnkey session has less than 180 s left', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-27T12:00:00Z') });
    stamper = openTurnkeySession(600_000);
    expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });

    vi.setSystemTime(Date.now() + 600_000 - 179_000);

    expect(await ensureV2Session(JUN)).toEqual({
      kind: 'unavailable',
      reason: 'no_session',
    });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'signs in',
      () => {
        vi.mocked(signIn).mockImplementationOnce(async () => ({
          ...dauthSession(),
          scopes: ['read'],
        }));
      },
    ],
    [
      'claims',
      () => {
        vi.mocked(lookupByWallet).mockResolvedValue(null);
        vi.mocked(claimDid).mockImplementationOnce(async () => ({
          did: DID,
          session: { ...dauthSession(), scopes: ['read'] },
          account: accountView(),
        }));
      },
    ],
  ])(
    'is v2_down when dauth grants no write scope as it %s, and keeps nothing',
    async (_name, arrange) => {
      arrange();

      expect(await ensureV2Session(JUN)).toEqual({
        kind: 'unavailable',
        reason: 'v2_down',
      });
      expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });
      expect(
        vi.mocked(signIn).mock.calls.length + vi.mocked(claimDid).mock.calls.length,
      ).toBe(2);
    },
  );

  it('signs in with the claimed DID, without claiming again, after a new Turnkey session', async () => {
    vi.mocked(lookupByWallet).mockResolvedValueOnce(null).mockResolvedValue(DID);
    await ensureV2Session(JUN);
    openTurnkeySession();

    expect(await ensureV2Session(JUN)).toMatchObject({
      kind: 'ready',
      session: { did: DID },
    });
    expect(claimDid).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(signIn).mock.calls[0][1]).toMatchObject({ did: DID });
  });
});

describe('ensureV2Session time limits', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    stamper = openTurnkeySession();
  });

  /** Starts ensureV2Session; `result()` is its answer once it has one. */
  const start = () => {
    let answer: unknown;
    void ensureV2Session(JUN).then((value) => {
      answer = value;
    });
    return { result: () => answer };
  };

  it('gives every sign-in request one fetch, and passes the request through', async () => {
    const fetch = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetch);
    vi.mocked(lookupByWallet).mockImplementation(async (cfg) => {
      await sdkRequest(cfg, 'https://accounts.dev.dimo.org/api/v2/accounts/by-wallet/x');
      return DID;
    });

    expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });

    const [cfg] = vi.mocked(lookupByWallet).mock.calls[0];
    expect(vi.mocked(smartAccountAddress).mock.calls[0][0]).toBe(cfg);
    expect(vi.mocked(signIn).mock.calls[0][0]).toBe(cfg);
    expect(fetch).toHaveBeenCalledWith(
      'https://accounts.dev.dimo.org/api/v2/accounts/by-wallet/x',
      expect.objectContaining({ method: 'POST', signal: expect.any(AbortSignal) }),
    );
  });

  it('keeps the signal the SDK passes', async () => {
    const fetch = fetchThatHangs();
    vi.stubGlobal('fetch', fetch);
    await ensureV2Session(JUN);
    const { fetchImpl } = vi.mocked(signIn).mock.calls[0][0];
    const caller = new AbortController();

    const request = fetchImpl!('https://dauth.dev.dimo.zone/x', {
      signal: caller.signal,
    });
    caller.abort(new Error('the SDK gave up'));

    expect(fetch.mock.calls[0][1]?.signal?.reason).toEqual(new Error('the SDK gave up'));
    await expect(request).rejects.toThrow('the SDK gave up');
  });

  it('cuts a request off after 10 s: v2_down', async () => {
    const fetch = fetchThatHangs();
    vi.stubGlobal('fetch', fetch);
    vi.mocked(lookupByWallet).mockImplementation(async (cfg) => {
      await sdkRequest(cfg, 'https://accounts.dev.dimo.org/api/v2/accounts/by-wallet/x');
      return DID;
    });

    const ensure = start();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(ensure.result()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);

    expect(ensure.result()).toEqual({ kind: 'unavailable', reason: 'v2_down' });
    expect(fetch.mock.calls[0][1]?.signal?.reason).toMatchObject({
      name: 'TimeoutError',
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('is v2_down at 20 s, and sends nothing more however the requests are retried', async () => {
    const fetch = fetchThatHangs();
    vi.stubGlobal('fetch', fetch);
    // As viem's transport reads the RPC: up to three retries, whatever the error.
    vi.mocked(smartAccountAddress).mockImplementation(async (cfg) => {
      for (let attempt = 0; ; attempt++) {
        try {
          await cfg.fetchImpl!('https://rpc.example/amoy', { method: 'POST' });
          return KERNEL;
        } catch (error) {
          if (attempt === 3) throw error;
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    });

    const ensure = start();
    await vi.advanceTimersByTimeAsync(19_999);
    expect(ensure.result()).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(ensure.result()).toEqual({ kind: 'unavailable', reason: 'v2_down' });
    // The request in flight (its own 10 s end at 20.15 s) is aborted with the budget.
    expect(fetch.mock.calls[1][1]?.signal?.aborted).toBe(true);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('is v2_down at 20 s when reading the account never answers', async () => {
    vi.mocked(getMe).mockImplementation(() => new Promise(() => {}));

    const ensure = start();
    await vi.advanceTimersByTimeAsync(19_999);
    expect(ensure.result()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);

    expect(ensure.result()).toEqual({ kind: 'unavailable', reason: 'v2_down' });
  });

  it('keeps nothing from a sign-in that finishes after the budget', async () => {
    vi.mocked(signIn).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(dauthSession()), 25_000)),
    );

    const ensure = start();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(ensure.result()).toEqual({ kind: 'unavailable', reason: 'v2_down' });
    await vi.advanceTimersByTimeAsync(5_000); // the late sign-in finishes

    expect(await ensureV2Session(JUN)).toMatchObject({ kind: 'ready' });
    expect(signIn).toHaveBeenCalledTimes(2);
  });
});

describe('sendCallsV2', () => {
  const calls = [{ to: KERNEL, value: BigInt(0), data: '0x' as Hex }];
  const USER_OP_HASH: Hex = `0x${'ab'.repeat(32)}`;
  const TX_HASH: Hex = `0x${'cd'.repeat(32)}`;
  const ready = (): V2Ready => ({
    kind: 'ready',
    session: dauthSession(),
    walletAccount,
    chainId: 80002,
  });

  it('sends the calls, then waits on the provider that took them for the transaction hash', async () => {
    const v2 = ready();
    vi.mocked(sendUserOperation).mockResolvedValue({
      userOpHash: USER_OP_HASH,
      provider: 'gelato',
    });
    vi.mocked(waitForUserOperationReceipt).mockResolvedValue({
      transactionHash: TX_HASH,
    });

    expect(await sendCallsV2(v2, calls)).toBe(TX_HASH);

    expect(sendUserOperation).toHaveBeenCalledWith(v2Config(), {
      session: v2.session,
      walletViemAccount: walletAccount,
      chainId: 80002,
      calls,
    });
    expect(waitForUserOperationReceipt).toHaveBeenCalledWith(v2Config(), {
      session: v2.session,
      chainId: 80002,
      provider: 'gelato',
      userOpHash: USER_OP_HASH,
    });
  });

  it('names the operation it sent to the caller before it waits for the receipt', async () => {
    const order: string[] = [];
    vi.mocked(sendUserOperation).mockResolvedValue({
      userOpHash: USER_OP_HASH,
      provider: 'pimlico',
    });
    vi.mocked(waitForUserOperationReceipt).mockImplementation(async () => {
      order.push('wait');
      return { transactionHash: TX_HASH };
    });
    const onSent = vi.fn(() => order.push('sent'));

    expect(await sendCallsV2(ready(), calls, onSent)).toBe(TX_HASH);

    expect(onSent).toHaveBeenCalledWith({
      userOpHash: USER_OP_HASH,
      provider: 'pimlico',
    });
    expect(order).toEqual(['sent', 'wait']);
  });

  it('throws a send with no definite answer as it is, and waits for nothing', async () => {
    const unknown = new UserOperationUnknownError(
      USER_OP_HASH,
      'alchemy',
      BigInt(7),
      null,
    );
    vi.mocked(sendUserOperation).mockRejectedValue(unknown);

    await expect(sendCallsV2(ready(), calls)).rejects.toBe(unknown);
    expect(waitForUserOperationReceipt).not.toHaveBeenCalled();
  });

  it.each([
    ['reverted', () => new UserOperationRevertedError(USER_OP_HASH, 'alchemy', 'nope')],
    ['pending', () => new UserOperationPendingError(USER_OP_HASH, 'alchemy', null)],
  ])('throws a %s operation as it is', async (_name, failure) => {
    const error = failure();
    vi.mocked(sendUserOperation).mockResolvedValue({
      userOpHash: USER_OP_HASH,
      provider: 'alchemy',
    });
    vi.mocked(waitForUserOperationReceipt).mockRejectedValue(error);

    await expect(sendCallsV2(ready(), calls)).rejects.toBe(error);
  });
});
