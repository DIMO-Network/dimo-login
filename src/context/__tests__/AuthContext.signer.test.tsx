/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
/**
 * The page has one wallet signer, and the transactions SDK's KernelSigner keeps
 * the last account's sessions. These tests run the real sign-in steps
 * (signInSteps.authenticateUser) against a stand-in signer that keeps state the
 * way KernelSigner 0.4.1 does, so a sign-in that reuses another account's
 * session shows up as the wrong wallet or a rejected challenge.
 */
import type { Mock } from 'vitest';
import React from 'react';
import { act, render } from '@testing-library/react';

const wallet = vi.hoisted(() => {
  const SESSION_MS = 11 * 60_000;
  const b64 = (value: object) => btoa(JSON.stringify(value));

  /** Each account's own wallet: its signing key's address and its smart account. */
  const addressesOf = (sub: string) => ({
    walletAddress: `0x${sub}-eoa` as `0x${string}`,
    kernelAddress: `0x${sub}-sca` as `0x${string}`,
  });

  type Session = { account?: string; expires: number };
  const noSession = (): Session => ({ account: undefined, expires: 0 });

  /** KernelSigner as far as sign-in uses it, state included. */
  class FakeKernelSigner {
    subOrganizationId?: string;
    walletAddress?: `0x${string}`;
    kernelAddress?: `0x${string}`;
    apiSessionClient = noSession();
    passkeySessionClient = noSession();
    passkeyClient = { valid: false };
    /** The account each passkey prompt was shown for, in order. */
    passkeyPrompts: string[] = [];

    resetClient() {
      this.subOrganizationId = undefined;
      this.walletAddress = undefined;
      this.kernelAddress = undefined;
      this.apiSessionClient = noSession();
      this.passkeySessionClient = noSession();
      this.passkeyClient = { valid: false };
      return true;
    }

    hasActiveSession() {
      const now = Date.now();
      return (
        this.apiSessionClient.expires > now ||
        this.passkeySessionClient.expires > now ||
        this.passkeyClient.valid
      );
    }

    private open(sub: string): Session {
      this.subOrganizationId = sub;
      Object.assign(this, addressesOf(sub));
      return { account: sub, expires: Date.now() + SESSION_MS };
    }

    async passkeyToSession(sub: string) {
      // The SDK returns at once while any passkey session is live.
      if (this.passkeySessionClient.expires > Date.now()) return;
      this.passkeyPrompts.push(sub);
      this.passkeyClient = { valid: true };
      this.passkeySessionClient = this.open(sub);
    }

    async openSessionWithApiStamper(sub: string) {
      this.apiSessionClient = this.open(sub);
    }

    /** The account getActiveClient signs with: the API-key session first. */
    activeAccount() {
      const now = Date.now();
      if (this.apiSessionClient.expires > now) return this.apiSessionClient.account!;
      if (this.passkeySessionClient.expires > now) {
        return this.passkeySessionClient.account!;
      }
      throw new Error('No active client');
    }

    async signChallenge(challenge: string) {
      return `${challenge}|signed-by:${addressesOf(this.activeAccount()).kernelAddress}`;
    }
  }

  /** The token the auth server issues for a smart account. */
  const tokenFor = (address: string) =>
    `${b64({ alg: 'none' })}.${b64({ sub: address, exp: Math.floor(Date.now() / 1000) + 7200 })}.sig`;

  return { signer: new FakeKernelSigner(), FakeKernelSigner, addressesOf, tokenFor };
});

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('../DevCredentialsContext', () => ({ useDevCredentials: vi.fn() }));
vi.mock('../UIManagerContext', () => ({ useUIManager: vi.fn() }));
vi.mock('../../services/walletLoader', () => ({
  signInStepsWithSigner: vi.fn(),
  loadSignInSteps: vi.fn(),
}));
vi.mock('../../utils/messageHandler', () => ({
  backToThirdParty: vi.fn(),
  sendMessageToReferrer: vi.fn(),
}));
vi.mock('../../services/accountsService', () => ({
  verifyOtp: async () => ({ credentialBundle: 'bundle' }),
}));
// The auth server issues a challenge for an address and accepts it only when
// that address signed it.
vi.mock('../../services/authService', () => ({
  generateChallenge: async ({ address }: { address: string }) => ({
    success: true,
    data: { challenge: `challenge-for:${address}`, state: address },
  }),
  submitWeb3Challenge: async ({ state, signature }: { state: string; signature: string }) =>
    signature === `challenge-for:${state}|signed-by:${state}`
      ? { success: true, data: { access_token: wallet.tokenFor(state) } }
      : { success: false, error: 'signed by another wallet' },
}));
// turnkeyService, wired to the stand-in signer the way the real one wraps KernelSigner.
vi.mock('../../services/turnkeyService', async () => {
  const { ApiKeyStamper } = await import('@turnkey/api-key-stamper');
  return {
    getKernelSigner: () => wallet.signer,
    getSmartContractAddress: () => wallet.signer.kernelAddress,
    getWalletAddress: () => wallet.signer.walletAddress,
    initializePasskey: (sub: string) => wallet.signer.passkeyToSession(sub),
    signChallenge: (challenge: string) => wallet.signer.signChallenge(challenge),
    getApiKeyStamper: ({ embeddedKey }: { embeddedKey: string }) =>
      new ApiKeyStamper({ apiPublicKey: 'public', apiPrivateKey: embeddedKey }),
    passkeyStamper: { stamp: 'passkey' },
    createKernelSigner: () => wallet.signer,
    createPasskey: vi.fn(),
  };
});

import { AuthProvider, useAuthContext } from '../AuthContext';
import { useDevCredentials } from '../DevCredentialsContext';
import { useUIManager } from '../UIManagerContext';
import * as signInSteps from '../../services/signInSteps';
import { signInStepsWithSigner } from '../../services/walletLoader';
import { logout } from '../../utils/authUtils';
import type { UserObject } from '../../models/user';

const account = (name: string): UserObject => ({
  email: `${name}@x.co`,
  subOrganizationId: `sub-${name}`,
  hasPasskey: true,
  walletAddress: null,
  smartContractAddress: null,
  emailVerified: true,
});
const ALICE = account('alice');
const BOB = account('bob');

let auth: ReturnType<typeof useAuthContext>;
const Probe = () => {
  auth = useAuthContext();
  return null;
};

const storedUser = () => JSON.parse(localStorage.getItem('user_data_0xc') ?? 'null');

const signInByPasskey = async (user: UserObject) => {
  act(() => auth.setUser(user));
  await act(() => auth.completePasskeyLogin());
};

const signInByCode = async (user: UserObject) => {
  act(() => auth.setUser(user));
  await act(() => auth.completeOTPLogin({ otpId: 'otp', otpCode: '123456' }));
};

beforeEach(() => {
  localStorage.clear();
  wallet.signer = new wallet.FakeKernelSigner();
  (useDevCredentials as Mock).mockReturnValue({
    clientId: '0xc',
    redirectUri: 'https://app.example/cb',
    utm: '',
  });
  (useUIManager as Mock).mockReturnValue({
    setUiState: vi.fn(),
    setError: vi.fn(),
    entryState: 'VEHICLE_MANAGER',
  });
  (signInStepsWithSigner as Mock).mockResolvedValue(signInSteps);
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
});

describe('every sign-in starts from a clean wallet signer', () => {
  it('Alice by passkey, then Bob by passkey: Bob is prompted and gets his own wallet', async () => {
    await signInByPasskey(ALICE);
    await signInByPasskey(BOB);

    expect(wallet.signer.passkeyPrompts).toEqual(['sub-alice', 'sub-bob']);
    const bob = wallet.addressesOf('sub-bob');
    expect(storedUser()).toMatchObject({
      email: 'bob@x.co',
      subOrganizationId: 'sub-bob',
      walletAddress: bob.walletAddress,
      smartContractAddress: bob.kernelAddress,
    });
    expect(auth.jwt).toBe(wallet.tokenFor(bob.kernelAddress));
  });

  it('Alice by email code, then Bob by passkey: Bob’s challenge is signed by Bob’s wallet', async () => {
    await signInByCode(ALICE);
    expect(wallet.signer.activeAccount()).toBe('sub-alice');

    await signInByPasskey(BOB);

    expect(wallet.signer.activeAccount()).toBe('sub-bob');
    expect(storedUser()).toMatchObject({
      subOrganizationId: 'sub-bob',
      smartContractAddress: wallet.addressesOf('sub-bob').kernelAddress,
    });
  });

  it('after a switch, validateSession for Bob never takes Alice’s live client', async () => {
    await signInByCode(ALICE);
    act(() => auth.switchAccount());
    // Bob, signed in to this app before, with a passkey wallet session.
    localStorage.setItem(
      'turnkey_session_sub-bob',
      JSON.stringify({ sessionType: 'passkey', expiresAt: Date.now() + 60_000 }),
    );
    act(() => auth.setUser(BOB));

    let valid: boolean | null = null;
    await act(async () => {
      valid = await auth.validateSession();
    });

    expect(valid).toBe(true);
    expect(wallet.signer.passkeyPrompts).toEqual(['sub-bob']);
    expect(wallet.signer.activeAccount()).toBe('sub-bob');
  });

  it('logging out and signing in again as the same passkey account prompts again', async () => {
    await signInByPasskey(ALICE);
    logout('0xc', 'https://app.example/cb', '', vi.fn());
    await signInByPasskey(ALICE);

    expect(wallet.signer.passkeyPrompts).toEqual(['sub-alice', 'sub-alice']);
  });
});
