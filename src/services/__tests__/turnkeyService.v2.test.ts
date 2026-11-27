/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
/**
 * The send wrappers with ACCOUNTS_V2_SENDS. Each sends through accounts v2
 * when it can serve the signed-in account, and through the wallet signer
 * (KernelSigner) only when v2 is unavailable, before anything was sent. The
 * real turnkeyService runs over a stand-in KernelSigner that holds the
 * account's state as KernelSigner does. ensureV2Session is the real one unless
 * a test makes it ready; sendCallsV2 is a stand-in. Sentry is the real one,
 * watched.
 */
import type { Mock } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const wallet = vi.hoisted(() => {
  class FakeKernelSigner {
    config: { environment?: string };
    subOrganizationId?: string;
    walletAddress?: `0x${string}`;
    smartContractAddress?: `0x${string}`;
    kernelAddress?: `0x${string}`;
    publicClient = { waitForTransactionReceipt: vi.fn() };
    executeTransaction = vi.fn();
    setVehiclePermissions = vi.fn();
    setVehiclePermissionsBulk = vi.fn();
    setAccountPermissions = vi.fn();
    constructor(config: { environment?: string }) {
      this.config = config;
      state.kernel = this;
    }
    resetClient() {
      return true;
    }
  }
  const state = { kernel: undefined as undefined | FakeKernelSigner };
  return { state, FakeKernelSigner };
});

vi.mock('@dimo-network/transactions', async (importOriginal) => {
  const sdk = await importOriginal<typeof import('@dimo-network/transactions')>();
  return {
    ...sdk,
    KernelSigner: wallet.FakeKernelSigner,
    newKernelConfig: (config: object) => config,
    vehiclePermissionsCalls: vi.fn(sdk.vehiclePermissionsCalls),
    vehiclePermissionsBulkCalls: vi.fn(sdk.vehiclePermissionsBulkCalls),
    accountPermissionsCalls: vi.fn(sdk.accountPermissionsCalls),
  };
});
vi.mock('../v2/accountsV2', async (importOriginal) => {
  const v2 = await importOriginal<typeof import('../v2/accountsV2')>();
  return { ...v2, ensureV2Session: vi.fn(v2.ensureV2Session), sendCallsV2: vi.fn() };
});
vi.mock('@sentry/react', async (importOriginal) => {
  const sentry = await importOriginal<typeof import('@sentry/react')>();
  return { ...sentry, captureException: vi.fn(sentry.captureException) };
});
// AdvancedTransaction's screen, for the app contract.
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    redirectUri: 'https://app.example/callback',
    utm: '',
    transactionData: {
      address: '0x2222222222222222222222222222222222222222',
      abi: [
        {
          type: 'function',
          name: 'transfer',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: ['0x3333333333333333333333333333333333333333', '1000'],
      value: BigInt(5),
    },
  }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({ jwt: 'app-jwt', validateSession: async () => true }),
}));
vi.mock('../../context/UIManagerContext', () => ({
  useUIManager: () => ({
    setUiState: () => {},
    setComponentData: () => {},
    setBusy: () => {},
  }),
}));
vi.mock('../../utils/messageHandler', () => ({
  backToThirdParty: vi.fn(),
  sendMessageToReferrer: vi.fn(),
}));

import * as sdk from '@dimo-network/transactions';
import {
  GasProxyError,
  type Session,
  UserOperationPendingError,
  UserOperationRevertedError,
  UserOperationUnknownError,
} from '@dimo-network/transactions/accounts';
import * as Sentry from '@sentry/react';
import { captureException, type Event } from '@sentry/react';
import type { ApiKeyStamper } from '@turnkey/api-key-stamper';
import { encodeFunctionData, type Hex, type LocalAccount } from 'viem';

import { AdvancedTransaction } from '../../components/AdvancedTransaction/AdvancedTransaction';
import { sentryOptions } from '../../sentryOptions';
import { sendMessageToReferrer } from '../../utils/messageHandler';
import { clearSessionStamper, setSessionStamper } from '../sessionStamper';
import {
  createKernelSigner,
  executeAdvancedTransaction,
  executeBatchTransactions,
  executeTransactionWithReceipt,
  setAccountPermissions,
  setVehiclePermissions,
  setVehiclePermissionsBatch,
  setVehiclePermissionsBulk,
  V2SendTimeoutError,
} from '../turnkeyService';
import {
  ensureV2Session,
  sendCallsV2,
  type V2Call,
  type V2Ready,
} from '../v2/accountsV2';

const actualSdk = await vi.importActual<typeof import('@dimo-network/transactions')>(
  '@dimo-network/transactions',
);

// What ensureV2Session needs to get as far as the Turnkey session.
const V2_ENV = {
  REACT_APP_DIMO_ACCOUNTS_URL: 'https://accounts.dev.dimo.org/api',
  REACT_APP_DAUTH_URL: 'https://dauth.dev.dimo.zone',
  REACT_APP_DID_DIRECTORY_URL: 'https://did.dev.dimo.zone',
  REACT_APP_TURNKEY_PARENT_ORG_ID: 'parent-org',
  REACT_APP_POLYGON_RPC_URL: 'https://rpc.example/amoy',
};

const SUB = 'sub-jun';
const WALLET: Hex = '0x1111111111111111111111111111111111111111';
const KERNEL: Hex = '0xAbCdEf000000000000000000000000000000AbCd';
const GRANTEE: Hex = '0x4444444444444444444444444444444444444444';
const LICENSE: Hex = '0xdb6c0dBbaf48b9D9Bcf5ca3C45cFF3811D70eD96';
const V1_HASH: Hex = `0x${'a1'.repeat(32)}`;
const V2_HASH: Hex = `0x${'b2'.repeat(32)}`;
const OP_HASH: Hex = `0x${'c3'.repeat(32)}`;
const V1_LOGS = [{ topics: ['0xv1'] }];
const CHAIN_LOGS = [{ topics: ['0xchain'] }];

const READY = {
  kind: 'ready',
  session: { did: 'did:dimo:jun', scopes: ['read', 'write'] } as unknown as Session,
  walletAccount: { address: WALLET } as unknown as LocalAccount,
  chainId: 80002,
} satisfies V2Ready;

const LICENSE_ABI = [
  {
    type: 'function',
    name: 'issueInDimo',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'licenseAlias', type: 'string' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'enableSigner',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'signer', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setRedirectUri',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'enabled', type: 'bool' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
] as const;
const TRANSFER_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
const TOKEN: Hex = '0x2222222222222222222222222222222222222222';
const RECIPIENT: Hex = '0x3333333333333333333333333333333333333333';

const permissions = [
  sdk.Permission.GetNonLocationHistory,
  sdk.Permission.GetLocationHistory,
];
const expiration = BigInt(1_900_000_000);
const source = 'ipfs://bafy-agreement';
const vehicleGrant = (tokenId: number) => ({
  tokenId: BigInt(tokenId),
  grantee: GRANTEE,
  permissions,
  expiration,
  source,
});

const kernel = () => wallet.state.kernel!;
const v1Receipt = () => ({
  userOperationHash: OP_HASH,
  success: true,
  receipt: { transactionHash: V1_HASH, logs: V1_LOGS },
  logs: [],
});

type Wrapper = {
  name: string;
  send: () => Promise<unknown>;
  /** The KernelSigner method it sends with as before, and today's arguments. */
  v1: () => Mock;
  v1Args: unknown[];
  /** What it gives sendCallsV2, in the dev environment the signer is set up for. */
  v2Calls: () => V2Call[];
  v1Result: unknown;
  v2Result: unknown;
};

const wrappers: Wrapper[] = [
  {
    name: 'executeAdvancedTransaction',
    send: () =>
      executeAdvancedTransaction(
        TOKEN,
        TRANSFER_ABI,
        'transfer',
        [RECIPIENT, '1000'],
        BigInt(5),
      ),
    v1: () => kernel().executeTransaction,
    v1Args: [
      {
        requireSignature: false,
        data: {
          address: TOKEN,
          value: BigInt(5),
          abi: TRANSFER_ABI,
          functionName: 'transfer',
          args: [RECIPIENT, BigInt(1000)],
        },
      },
    ],
    v2Calls: () => [
      {
        to: TOKEN,
        value: BigInt(5),
        data: encodeFunctionData({
          abi: TRANSFER_ABI,
          functionName: 'transfer',
          args: [RECIPIENT, BigInt(1000)],
        }),
      },
    ],
    v1Result: V1_HASH,
    v2Result: V2_HASH,
  },
  {
    name: 'executeTransactionWithReceipt',
    send: () =>
      executeTransactionWithReceipt(LICENSE, LICENSE_ABI, 'issueInDimo', ['jun@x.co']),
    v1: () => kernel().executeTransaction,
    v1Args: [
      {
        requireSignature: false,
        data: {
          address: LICENSE,
          abi: LICENSE_ABI,
          functionName: 'issueInDimo',
          args: ['jun@x.co'],
        },
      },
    ],
    v2Calls: () => [
      {
        to: LICENSE,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: LICENSE_ABI,
          functionName: 'issueInDimo',
          args: ['jun@x.co'],
        }),
      },
    ],
    v1Result: { transactionHash: V1_HASH, logs: V1_LOGS },
    v2Result: { transactionHash: V2_HASH, logs: CHAIN_LOGS },
  },
  {
    name: 'executeBatchTransactions',
    send: () =>
      executeBatchTransactions([
        {
          address: LICENSE,
          abi: LICENSE_ABI,
          functionName: 'enableSigner',
          args: [BigInt(7), WALLET],
        },
        {
          address: LICENSE,
          abi: LICENSE_ABI,
          functionName: 'setRedirectUri',
          args: [BigInt(7), true, 'https://app.example/callback'],
          value: BigInt(3),
        },
      ]),
    v1: () => kernel().executeTransaction,
    v1Args: [
      {
        requireSignature: false,
        data: [
          {
            address: LICENSE,
            abi: LICENSE_ABI,
            functionName: 'enableSigner',
            args: [BigInt(7), WALLET],
          },
          {
            address: LICENSE,
            abi: LICENSE_ABI,
            functionName: 'setRedirectUri',
            args: [BigInt(7), true, 'https://app.example/callback'],
            value: BigInt(3),
          },
        ],
      },
    ],
    v2Calls: () => [
      {
        to: LICENSE,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: LICENSE_ABI,
          functionName: 'enableSigner',
          args: [BigInt(7), WALLET],
        }),
      },
      {
        to: LICENSE,
        value: BigInt(3),
        data: encodeFunctionData({
          abi: LICENSE_ABI,
          functionName: 'setRedirectUri',
          args: [BigInt(7), true, 'https://app.example/callback'],
        }),
      },
    ],
    v1Result: { transactionHash: V1_HASH, logs: V1_LOGS },
    v2Result: { transactionHash: V2_HASH, logs: CHAIN_LOGS },
  },
  {
    name: 'setVehiclePermissions',
    // A templateId is dropped, as the wallet signer has always been sent.
    send: () => setVehiclePermissions({ ...vehicleGrant(11), templateId: BigInt(9) }),
    v1: () => kernel().setVehiclePermissions,
    v1Args: [vehicleGrant(11)],
    v2Calls: () => actualSdk.vehiclePermissionsCalls(vehicleGrant(11), 'dev'),
    v1Result: undefined,
    v2Result: undefined,
  },
  {
    name: 'setVehiclePermissionsBatch',
    send: () =>
      setVehiclePermissionsBatch([
        vehicleGrant(11),
        { ...vehicleGrant(12), templateId: BigInt(9) },
      ]),
    v1: () => kernel().setVehiclePermissions,
    v1Args: [[vehicleGrant(11), { ...vehicleGrant(12), templateId: BigInt(9) }]],
    v2Calls: () =>
      actualSdk.vehiclePermissionsCalls(
        [vehicleGrant(11), { ...vehicleGrant(12), templateId: BigInt(9) }],
        'dev',
      ),
    v1Result: undefined,
    v2Result: undefined,
  },
  {
    name: 'setVehiclePermissionsBulk',
    send: () =>
      setVehiclePermissionsBulk({
        tokenIds: [BigInt(11), BigInt(12)],
        grantee: GRANTEE,
        permissions,
        expiration,
        source,
      }),
    v1: () => kernel().setVehiclePermissionsBulk,
    v1Args: [
      {
        tokenIds: [BigInt(11), BigInt(12)],
        grantee: GRANTEE,
        permissions,
        expiration,
        source,
      },
    ],
    v2Calls: () =>
      actualSdk.vehiclePermissionsBulkCalls(
        {
          tokenIds: [BigInt(11), BigInt(12)],
          grantee: GRANTEE,
          permissions,
          expiration,
          source,
        },
        'dev',
      ),
    v1Result: undefined,
    v2Result: undefined,
  },
  {
    name: 'setAccountPermissions',
    send: () =>
      setAccountPermissions({
        grantee: GRANTEE,
        permissions,
        expiration,
        templateId: BigInt(0),
        source,
      }),
    v1: () => kernel().setAccountPermissions,
    v1Args: [
      { grantee: GRANTEE, permissions, expiration, templateId: BigInt(0), source },
    ],
    v2Calls: () =>
      actualSdk.accountPermissionsCalls(
        { grantee: GRANTEE, permissions, expiration, templateId: BigInt(0), source },
        'dev',
      ),
    v1Result: undefined,
    v2Result: undefined,
  },
];

const builders = () => [
  sdk.vehiclePermissionsCalls,
  sdk.vehiclePermissionsBulkCalls,
  sdk.accountPermissionsCalls,
];

beforeEach(() => {
  process.env.REACT_APP_ENVIRONMENT = 'dev';
  createKernelSigner('0xc', 'https://app.example', 'https://app.example/callback');
  // Signed in: the account the wallet signer holds a session for.
  Object.assign(kernel(), {
    subOrganizationId: SUB,
    walletAddress: WALLET,
    smartContractAddress: KERNEL,
    kernelAddress: KERNEL,
  });
  kernel().executeTransaction.mockResolvedValue(v1Receipt());
  kernel().setVehiclePermissions.mockResolvedValue(v1Receipt());
  kernel().setVehiclePermissionsBulk.mockResolvedValue(v1Receipt());
  kernel().setAccountPermissions.mockResolvedValue(v1Receipt());
  kernel().publicClient.waitForTransactionReceipt.mockResolvedValue({
    transactionHash: V2_HASH,
    logs: CHAIN_LOGS,
  });
  // The operation is sent (and named) before its receipt gives the transaction hash.
  vi.mocked(sendCallsV2).mockImplementation(async (_ready, _calls, onSent) => {
    onSent?.({ userOpHash: OP_HASH, provider: 'alchemy' });
    return V2_HASH;
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  clearSessionStamper();
  delete process.env.REACT_APP_ACCOUNTS_V2_SENDS;
  delete process.env.REACT_APP_ENVIRONMENT;
  Object.keys(V2_ENV).forEach((key) => delete process.env[key]);
  vi.restoreAllMocks();
});

it('targets the dev contracts, as the signer does, not the SDK default', () => {
  expect(kernel().config.environment).toBe('dev');
  expect(actualSdk.vehiclePermissionsCalls(vehicleGrant(11), 'dev')[0].to).not.toBe(
    actualSdk.vehiclePermissionsCalls(vehicleGrant(11))[0].to,
  );
});

describe.each(wrappers)('$name', (wrapper) => {
  describe('with accounts v2 ready', () => {
    beforeEach(() => {
      process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
      vi.mocked(ensureV2Session).mockResolvedValue(READY);
    });

    it('sends exactly its calls through accounts v2, and nothing through the wallet signer', async () => {
      expect(await wrapper.send()).toEqual(wrapper.v2Result);

      expect(ensureV2Session).toHaveBeenCalledWith({
        subOrganizationId: SUB,
        walletAddress: WALLET,
        smartContractAddress: KERNEL,
      });
      expect(sendCallsV2).toHaveBeenCalledTimes(1);
      expect(sendCallsV2).toHaveBeenCalledWith(
        READY,
        wrapper.v2Calls(),
        expect.any(Function),
      );
      expect(wrapper.v1()).not.toHaveBeenCalled();
    });

    it('says it sent through accounts v2, naming the operation and its provider', async () => {
      await wrapper.send();

      expect(console.info).toHaveBeenCalledWith(
        `Sent through accounts v2: UserOperation ${OP_HASH} via alchemy`,
      );
      expect(console.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Sent through the wallet signer'),
      );
      expect(captureException).not.toHaveBeenCalled();
    });

    describe('with no answer for 240 s', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      /** Starts the send; `outcome()` is how it settled, once it has. */
      const start = () => {
        let outcome: { error: unknown } | { value: unknown } | undefined;
        wrapper.send().then(
          (value) => (outcome = { value }),
          (error) => (outcome = { error }),
        );
        return { outcome: () => outcome };
      };

      it('fails as unknown when no operation was named, reported, and sends nothing again', async () => {
        vi.mocked(sendCallsV2).mockImplementation(() => new Promise(() => {}));

        const send = start();
        await vi.advanceTimersByTimeAsync(239_999);
        expect(send.outcome()).toBeUndefined();
        await vi.advanceTimersByTimeAsync(1);

        const { error } = send.outcome() as { error: unknown };
        expect(error).toBeInstanceOf(V2SendTimeoutError);
        expect(wrapper.v1()).not.toHaveBeenCalled();
        expect(sendCallsV2).toHaveBeenCalledTimes(1);
        expect(captureException).toHaveBeenCalledWith(error, {
          contexts: { user_operation: { userOpHash: null, provider: null } },
        });
      });

      it('fails as pending once the operation is named, reported with it, and sends nothing again', async () => {
        vi.mocked(sendCallsV2).mockImplementation((_ready, _calls, onSent) => {
          onSent?.({ userOpHash: OP_HASH, provider: 'gelato' });
          return new Promise(() => {});
        });

        const send = start();
        await vi.advanceTimersByTimeAsync(239_999);
        expect(send.outcome()).toBeUndefined();
        await vi.advanceTimersByTimeAsync(1);

        const { error } = send.outcome() as { error: unknown };
        expect(error).toBeInstanceOf(UserOperationPendingError);
        expect(error).toMatchObject({ userOpHash: OP_HASH, provider: 'gelato' });
        expect(wrapper.v1()).not.toHaveBeenCalled();
        expect(sendCallsV2).toHaveBeenCalledTimes(1);
        expect(captureException).toHaveBeenCalledWith(error, {
          contexts: { user_operation: { userOpHash: OP_HASH, provider: 'gelato' } },
        });
        expect(console.info).not.toHaveBeenCalledWith(
          expect.stringContaining('Sent through accounts v2'),
        );
      });
    });

    it.each([
      [
        'UserOperationUnknownError',
        () =>
          new UserOperationUnknownError(
            OP_HASH,
            'alchemy',
            BigInt(1),
            new Error('timeout'),
          ),
      ],
      [
        'UserOperationPendingError',
        () => new UserOperationPendingError(OP_HASH, 'gelato', new Error('slow')),
      ],
      [
        'UserOperationRevertedError',
        () => new UserOperationRevertedError(OP_HASH, 'pimlico', 'denied'),
      ],
    ])(
      'rethrows a %s, reported with its operation, and sends nothing again',
      async (_name, failure) => {
        const error = failure();
        vi.mocked(sendCallsV2).mockRejectedValue(error);

        await expect(wrapper.send()).rejects.toBe(error);

        expect(sendCallsV2).toHaveBeenCalledTimes(1);
        expect(wrapper.v1()).not.toHaveBeenCalled();
        expect(captureException).toHaveBeenCalledTimes(1);
        expect(captureException).toHaveBeenCalledWith(error, {
          contexts: { user_operation: { userOpHash: OP_HASH, provider: error.provider } },
        });
      },
    );

    it('rethrows an error that names no operation as it is, and sends nothing again', async () => {
      const error = new GasProxyError(429, 'alchemy', 5);
      vi.mocked(sendCallsV2).mockRejectedValue(error);

      await expect(wrapper.send()).rejects.toBe(error);

      expect(sendCallsV2).toHaveBeenCalledTimes(1);
      expect(wrapper.v1()).not.toHaveBeenCalled();
      expect(captureException).not.toHaveBeenCalled();
    });
  });

  it('sends through the wallet signer, as today, when accounts v2 is unavailable', async () => {
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    vi.mocked(ensureV2Session).mockResolvedValue({
      kind: 'unavailable',
      reason: 'v2_down',
    });

    expect(await wrapper.send()).toEqual(wrapper.v1Result);

    expect(wrapper.v1()).toHaveBeenCalledTimes(1);
    expect(wrapper.v1()).toHaveBeenCalledWith(...wrapper.v1Args);
    expect(sendCallsV2).not.toHaveBeenCalled();
    // Why, in the console (a breadcrumb in Sentry); no event of its own.
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('(v2_down)'));
    expect(console.info).not.toHaveBeenCalledWith(
      expect.stringContaining('Sent through accounts v2'),
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it('sends through the wallet signer in the Turnkey session’s last 180 s', async () => {
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    Object.assign(process.env, V2_ENV);
    setSessionStamper(
      { stamp: vi.fn() } as unknown as ApiKeyStamper,
      Date.now() + 100_000,
    );

    expect(await wrapper.send()).toEqual(wrapper.v1Result);

    await expect(vi.mocked(ensureV2Session).mock.results[0].value).resolves.toEqual({
      kind: 'unavailable',
      reason: 'no_session',
    });
    expect(wrapper.v1()).toHaveBeenCalledWith(...wrapper.v1Args);
    expect(sendCallsV2).not.toHaveBeenCalled();
  });

  it('sends as today with the flag off: only ensureV2Session is asked', async () => {
    expect(await wrapper.send()).toEqual(wrapper.v1Result);

    expect(ensureV2Session).toHaveBeenCalledTimes(1);
    await expect(vi.mocked(ensureV2Session).mock.results[0].value).resolves.toEqual({
      kind: 'unavailable',
      reason: 'flag_off',
    });
    expect(sendCallsV2).not.toHaveBeenCalled();
    builders().forEach((builder) => expect(builder).not.toHaveBeenCalled());
    expect(kernel().publicClient.waitForTransactionReceipt).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(wrapper.v1()).toHaveBeenCalledTimes(1);
    expect(wrapper.v1()).toHaveBeenCalledWith(...wrapper.v1Args);
  });
});

describe('a receipt after a v2 send', () => {
  beforeEach(() => {
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    vi.mocked(ensureV2Session).mockResolvedValue(READY);
  });

  it('is read from the chain for its transaction', async () => {
    await executeTransactionWithReceipt(LICENSE, LICENSE_ABI, 'issueInDimo', [
      'jun@x.co',
    ]);

    expect(kernel().publicClient.waitForTransactionReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ hash: V2_HASH }),
    );
  });

  it('that can’t be read fails the call, and nothing is sent again', async () => {
    const error = new Error('receipt not found');
    kernel().publicClient.waitForTransactionReceipt.mockRejectedValue(error);

    await expect(
      executeTransactionWithReceipt(LICENSE, LICENSE_ABI, 'issueInDimo', ['jun@x.co']),
    ).rejects.toBe(error);

    expect(sendCallsV2).toHaveBeenCalledTimes(1);
    expect(kernel().executeTransaction).not.toHaveBeenCalled();
  });

  it('that can’t be read leaves a landed batch done, with no logs, and says so', async () => {
    const error = new Error('receipt not found');
    kernel().publicClient.waitForTransactionReceipt.mockRejectedValue(error);

    expect(
      await executeBatchTransactions([
        {
          address: LICENSE,
          abi: LICENSE_ABI,
          functionName: 'enableSigner',
          args: [BigInt(7), WALLET],
        },
      ]),
    ).toEqual({ transactionHash: V2_HASH, logs: [] });

    // A breadcrumb in Sentry; no event of its own.
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(V2_HASH), error);
    expect(captureException).not.toHaveBeenCalled();
    expect(sendCallsV2).toHaveBeenCalledTimes(1);
    expect(kernel().executeTransaction).not.toHaveBeenCalled();
  });

  it('that never comes counts in the 240 s: pending, with the operation', async () => {
    vi.useFakeTimers();
    kernel().publicClient.waitForTransactionReceipt.mockImplementation(
      () => new Promise(() => {}),
    );
    let outcome: unknown;
    executeTransactionWithReceipt(LICENSE, LICENSE_ABI, 'issueInDimo', [
      'jun@x.co',
    ]).catch((error: unknown) => (outcome = error));

    await vi.advanceTimersByTimeAsync(239_999);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);

    expect(outcome).toBeInstanceOf(UserOperationPendingError);
    expect(outcome).toMatchObject({ userOpHash: OP_HASH, provider: 'alchemy' });
    expect(kernel().executeTransaction).not.toHaveBeenCalled();
  });
});

describe('a malformed request with ACCOUNTS_V2_SENDS on', () => {
  beforeEach(() => {
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    vi.mocked(ensureV2Session).mockResolvedValue(READY);
  });

  it.each([
    [
      'executeAdvancedTransaction',
      () =>
        executeAdvancedTransaction(TOKEN, TRANSFER_ABI, 'transferFrom', [RECIPIENT, '1']),
    ],
    [
      'executeTransactionWithReceipt',
      () => executeTransactionWithReceipt(LICENSE, LICENSE_ABI, 'issueInDimo', []),
    ],
    [
      'executeBatchTransactions',
      () =>
        executeBatchTransactions([
          {
            address: LICENSE,
            abi: LICENSE_ABI,
            functionName: 'enableSigner',
            args: [BigInt(7), 'not-an-address'],
          },
        ]),
    ],
    [
      'setVehiclePermissions',
      () => setVehiclePermissions({ ...vehicleGrant(11), grantee: '0xnot' as Hex }),
    ],
    [
      'setAccountPermissions',
      () =>
        setAccountPermissions({
          grantee: '0xnot' as Hex,
          permissions,
          expiration,
          templateId: BigInt(0),
          source,
        }),
    ],
  ])('%s fails before any sign-in or claim, and sends nothing', async (_name, send) => {
    await expect(send()).rejects.toThrow();

    expect(ensureV2Session).not.toHaveBeenCalled();
    expect(sendCallsV2).not.toHaveBeenCalled();
    expect(kernel().executeTransaction).not.toHaveBeenCalled();
    expect(kernel().setVehiclePermissions).not.toHaveBeenCalled();
    expect(kernel().setAccountPermissions).not.toHaveBeenCalled();
  });
});

describe('AdvancedTransaction', () => {
  const approve = () => {
    const view = render(createElement(AdvancedTransaction));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    return view;
  };
  const posted = async () => {
    await waitFor(() => expect(sendMessageToReferrer).toHaveBeenCalledTimes(1));
    const [message, redirectUri] = vi.mocked(sendMessageToReferrer).mock.calls[0];
    vi.mocked(sendMessageToReferrer).mockClear();
    return { message: message as Record<string, unknown>, redirectUri };
  };
  /** Each key's type, the way an app reading the message sees it. */
  const shape = (message: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(message).map(([key, value]) => [key, typeof value]),
    );

  it('posts a transactionResponse with the same keys and types with the flag on and off', async () => {
    const off = approve();
    const before = await posted();
    off.unmount();

    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    vi.mocked(ensureV2Session).mockResolvedValue(READY);
    approve();
    const after = await posted();

    expect(before.message).toEqual({
      eventType: 'transactionResponse',
      token: 'app-jwt',
      transactionHash: V1_HASH,
    });
    expect(after.message.transactionHash).toBe(V2_HASH);
    expect(shape(after.message)).toEqual(shape(before.message));
    expect(Object.keys(after.message)).toEqual(Object.keys(before.message));
    expect(after.redirectUri).toBe(before.redirectUri);
  });

  it('shows the failed transaction when the v2 outcome is unknown, sends nothing again, and sends Sentry one event naming the operation', async () => {
    const events: Event[] = [];
    Sentry.init({
      ...sentryOptions,
      dsn: 'https://public@o0.ingest.sentry.io/0',
      transport: () => ({
        send: (envelope) => {
          envelope[1].forEach(([header, payload]) => {
            if (header.type === 'event') events.push(payload as Event);
          });
          return Promise.resolve({});
        },
        flush: () => Promise.resolve(true),
      }),
    });
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    vi.mocked(ensureV2Session).mockResolvedValue(READY);
    const error = new UserOperationUnknownError(
      OP_HASH,
      'alchemy',
      BigInt(1),
      new Error('timeout'),
    );
    vi.mocked(sendCallsV2).mockRejectedValue(error);

    try {
      approve();

      expect(
        await screen.findByText('Couldn’t complete the transaction. Try again.'),
      ).toBeInTheDocument();
      expect(sendMessageToReferrer).not.toHaveBeenCalled();
      expect(sendCallsV2).toHaveBeenCalledTimes(1);
      expect(kernel().executeTransaction).not.toHaveBeenCalled();
      // The screen captures the error too, as it always has: still one event.
      expect(captureException).toHaveBeenLastCalledWith(error);
      await Sentry.flush(1000);
      expect(events).toHaveLength(1);
      // Sentry lists the error's cause first and the error itself last.
      expect(events[0].exception?.values?.at(-1)?.type).toBe('UserOperationUnknownError');
      expect(events[0].contexts?.user_operation).toEqual({
        userOpHash: OP_HASH,
        provider: 'alchemy',
      });
    } finally {
      await Sentry.close();
    }
  });
});
