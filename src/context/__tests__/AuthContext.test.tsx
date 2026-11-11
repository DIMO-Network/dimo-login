import type { Mock } from 'vitest';
import React from 'react';
import { act, render } from '@testing-library/react';
import { captureException } from '@sentry/react';

import { AuthProvider, useAuthContext } from '../AuthContext';
import { useDevCredentials } from '../DevCredentialsContext';
import { useUIManager } from '../UIManagerContext';
import { signInStepsWithSigner, type SignInSteps } from '../../services/walletLoader';
import { UiStates } from '../../enums';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('../DevCredentialsContext', () => ({ useDevCredentials: vi.fn() }));
vi.mock('../UIManagerContext', () => ({ useUIManager: vi.fn() }));
vi.mock('../../services/walletLoader', () => ({
  signInStepsWithSigner: vi.fn(),
  loadSignInSteps: vi.fn(),
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

let auth: ReturnType<typeof useAuthContext>;
const Probe = () => {
  auth = useAuthContext();
  return null;
};

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

const signInAs = (subOrganizationId: string) =>
  act(() => auth.setUser({ ...auth.user, subOrganizationId }));

const b64 = (value: object) => btoa(JSON.stringify(value));
const JWT = `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 7200 })}.sig`;

/** Fake sign-in steps; the kernel signer is the given object over sensible defaults. */
const stepsWith = (
  kernelSigner: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {},
) =>
  ({
    getKernelSigner: () => ({
      hasActiveSession: () => false,
      openSessionWithApiStamper: vi.fn().mockResolvedValue(undefined),
      passkeySessionClient: { expires: Date.now() + 60_000 },
      ...kernelSigner,
    }),
    getApiKeyStamper: vi.fn(() => ({ stamp: 'api' })),
    initializePasskey: vi.fn().mockResolvedValue(undefined),
    authenticateUser: vi.fn().mockResolvedValue({
      accessToken: JWT,
      walletAddress: '0xw',
      smartContractAddress: '0xs',
      turnkeySessionExpiration: Date.now() + 60_000,
    }),
    passkeyStamper: { stamp: 'passkey' },
    ...overrides,
  }) as unknown as SignInSteps;

let setUiState: Mock;
let setError: Mock;
let signer: ReturnType<typeof deferred<SignInSteps>>;

beforeEach(() => {
  // The Vitest config (mockReset) resets mock implementations before each test.
  localStorage.clear();
  setUiState = vi.fn();
  setError = vi.fn();
  signer = deferred<SignInSteps>();
  (useDevCredentials as Mock).mockReturnValue({
    clientId: '0xc',
    redirectUri: 'https://app.example/cb',
    utm: '',
  });
  (useUIManager as Mock).mockReturnValue({
    setUiState,
    setError,
    entryState: 'EMAIL_INPUT',
  });
  (signInStepsWithSigner as Mock).mockReturnValue(signer.promise);
});

describe('AuthContext validateSession', () => {
  it('validateSession waits for the kernel signer before checking the session', async () => {
    localStorage.setItem(
      'turnkey_session_sub',
      JSON.stringify({ sessionType: 'passkey', expiresAt: Date.now() + 60_000 }),
    );
    renderProvider();
    signInAs('sub');
    const getKernelSigner = vi.fn(() => ({ hasActiveSession: () => true }));

    let settled = false;
    const validated = auth.validateSession().finally(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(getKernelSigner).not.toHaveBeenCalled();
    expect(settled).toBe(false);

    signer.resolve({ getKernelSigner } as unknown as SignInSteps);

    await expect(validated).resolves.toBe(true);
    expect(getKernelSigner).toHaveBeenCalled();
  });

  it('validateSession sends a user with no session to the email screen without loading the wallet', async () => {
    renderProvider();
    signInAs('sub');

    await expect(auth.validateSession()).resolves.toBeNull();

    expect(setUiState).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
    expect(signInStepsWithSigner).not.toHaveBeenCalled();
  });
});

describe('AuthContext per-account wallet sessions', () => {
  const apiKeySession = (expiresAt = Date.now() + 60_000) =>
    JSON.stringify({
      sessionType: 'api_key',
      embeddedKey: 'k',
      credentialBundle: 'b',
      expiresAt,
    });

  it('validateSession uses the signed-in account’s wallet session, not another account’s', async () => {
    localStorage.setItem(
      'turnkey_session_sub-b',
      JSON.stringify({ sessionType: 'passkey', expiresAt: Date.now() + 60_000 }),
    );
    renderProvider();
    signInAs('sub-a');
    signer.resolve(stepsWith({ hasActiveSession: () => false }));
    await expect(auth.validateSession()).resolves.toBeNull();
    expect(setUiState).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
  });

  it('asks for a code again when the stored key was revoked elsewhere', async () => {
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    signInAs('sub-a');
    signer.resolve(
      stepsWith({
        hasActiveSession: () => false,
        openSessionWithApiStamper: vi
          .fn()
          .mockRejectedValue(new Error('api key not found')),
      }),
    );
    await expect(auth.validateSession()).resolves.toBeNull();
    expect(setUiState).toHaveBeenCalledWith(UiStates.OTP_INPUT);
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expect(captureException).toHaveBeenCalledWith(new Error('api key not found'));
  });

  it('validateSession with the wallet session gone sends the user to sign in without loading the wallet', async () => {
    renderProvider();
    signInAs('sub-a');
    await expect(auth.validateSession()).resolves.toBeNull();
    expect(setUiState).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
    expect(signInStepsWithSigner).not.toHaveBeenCalled();
  });

  it('resumeAccount signs in as the clicked account, not the one signed in before', async () => {
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    signInAs('sub-b');
    signer.resolve(stepsWith());
    await act(async () => {
      await auth.resumeAccount({
        email: 'alice@x.co',
        subOrganizationId: 'sub-a',
        lastUsedAt: 1,
      });
    });
    expect(auth.user.subOrganizationId).toBe('sub-a');
    expect(JSON.parse(localStorage.getItem('user_data_0xc') ?? '{}').email).toBe(
      'alice@x.co',
    );
    expect(JSON.parse(localStorage.getItem('dimo_accounts') ?? '[]')[0].email).toBe(
      'alice@x.co',
    );
  });

  it('resumeAccount keeps the wallet session when a step after sign-in throws', async () => {
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    signer.resolve(stepsWith());
    setUiState.mockImplementation(() => {
      throw new Error('ui broke');
    });
    // The entry state is EMAIL_INPUT with no consent screen needed, so sending to the app
    // ends in setUiState(SUCCESS).
    await expect(
      act(() =>
        auth.resumeAccount({
          email: 'alice@x.co',
          subOrganizationId: 'sub-a',
          lastUsedAt: 1,
        }),
      ),
    ).rejects.toThrow();
    expect(localStorage.getItem('turnkey_session_sub-a')).not.toBeNull();
  });

  it('a cancelled passkey prompt still propagates', async () => {
    localStorage.setItem(
      'turnkey_session_sub-a',
      JSON.stringify({ sessionType: 'passkey', expiresAt: Date.now() + 60_000 }),
    );
    renderProvider();
    signInAs('sub-a');
    signer.resolve(
      stepsWith(
        {},
        { initializePasskey: vi.fn().mockRejectedValue(new Error('cancelled')) },
      ),
    );
    await expect(auth.validateSession()).rejects.toThrow('cancelled');
    expect(localStorage.getItem('turnkey_session_sub-a')).not.toBeNull();
  });

  it('resumeAccount signs in silently with a live email-code session', async () => {
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    const authenticateUser = vi.fn().mockResolvedValue({
      accessToken: JWT,
      walletAddress: '0xw',
      smartContractAddress: '0xs',
      turnkeySessionExpiration: Date.now() + 60_000,
    });
    signer.resolve(stepsWith({}, { authenticateUser }));
    let resumed: boolean | undefined;
    await act(async () => {
      resumed = await auth.resumeAccount({
        email: 'alice@x.co',
        subOrganizationId: 'sub-a',
        lastUsedAt: 1,
      });
    });
    expect(resumed).toBe(true);
    expect(authenticateUser).toHaveBeenCalledWith(
      '0xc',
      'https://app.example/cb',
      'sub-a',
      expect.anything(),
    );
    expect(auth.user.email).toBe('alice@x.co');
    expect(auth.user.subOrganizationId).toBe('sub-a');
    expect(auth.jwt).toBe(JWT);
    expect(JSON.parse(localStorage.getItem('user_data_0xc') ?? '{}').email).toBe(
      'alice@x.co',
    );
    expect(JSON.parse(localStorage.getItem('dimo_accounts') ?? '[]')[0].email).toBe(
      'alice@x.co',
    );
  });

  it('resumeAccount clears the session and returns false when sign-in throws', async () => {
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    signer.resolve(
      stepsWith(
        {},
        { authenticateUser: vi.fn().mockRejectedValue(new Error('revoked')) },
      ),
    );
    await expect(
      auth.resumeAccount({
        email: 'alice@x.co',
        subOrganizationId: 'sub-a',
        lastUsedAt: 1,
      }),
    ).resolves.toBe(false);
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expect(captureException).toHaveBeenCalledWith(new Error('revoked'));
  });

  it.each([
    ['a passkey session', { sessionType: 'passkey', expiresAt: Date.now() + 60_000 }],
    [
      'an expired key',
      {
        sessionType: 'api_key',
        embeddedKey: 'k',
        credentialBundle: 'b',
        expiresAt: Date.now() - 1,
      },
    ],
    ['no session', null],
  ])('resumeAccount leaves %s to the passkey or code step', async (_, session) => {
    if (session) localStorage.setItem('turnkey_session_sub-a', JSON.stringify(session));
    renderProvider();
    await expect(
      auth.resumeAccount({
        email: 'alice@x.co',
        subOrganizationId: 'sub-a',
        lastUsedAt: 1,
      }),
    ).resolves.toBe(false);
    expect(signInStepsWithSigner).not.toHaveBeenCalled();
  });

  it('switchAccount signs this app out and opens sign-in, keeping the wallet session', () => {
    localStorage.setItem(
      'turnkey_session_sub-a',
      JSON.stringify({ sessionType: 'passkey', expiresAt: 9 }),
    );
    localStorage.setItem('user_data_0xc', JSON.stringify({ email: 'alice@x.co' }));
    renderProvider();
    signInAs('sub-a');
    act(() => auth.switchAccount());
    expect(localStorage.getItem('user_data_0xc')).toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-a')).not.toBeNull();
    expect(auth.user.subOrganizationId).toBe('');
    expect(setUiState).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
    expect(setError).toHaveBeenCalledWith(null);
  });
});

describe('AuthContext sign-up', () => {
  it('runs the sign-up sequence and shares its draft', async () => {
    renderProvider();
    await act(() => auth.signUp.start('a@b.co', 'tok'));
    expect(auth.signUpDraft).toEqual({
      kind: 'proof',
      email: 'a@b.co',
      proofToken: 'tok',
    });
    expect(setUiState).toHaveBeenCalledWith(UiStates.PASSKEY_GENERATOR, {
      setBack: true,
    });
  });

  it('resetUser also drops the sign-up in progress', async () => {
    renderProvider();
    await act(() => auth.signUp.start('a@b.co', 'tok'));
    act(() => auth.resetUser());
    expect(auth.signUpDraft).toBeNull();
  });
});
