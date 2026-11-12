import type { Mock } from 'vitest';
import React from 'react';
import { act, render } from '@testing-library/react';
import { captureException } from '@sentry/react';

import { AuthProvider, useAuthContext } from '../AuthContext';
import { useDevCredentials } from '../DevCredentialsContext';
import { useUIManager } from '../UIManagerContext';
import { signInStepsWithSigner, type SignInSteps } from '../../services/walletLoader';
import { verifyOtp } from '../../services/accountsService';
import { PasskeyOffer } from '../../screens';
import { shouldOfferPasskey } from '../../services/passkeyOffer';
import { UiStates } from '../../enums';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('../DevCredentialsContext', () => ({ useDevCredentials: vi.fn() }));
vi.mock('../UIManagerContext', () => ({ useUIManager: vi.fn() }));
vi.mock('../../services/walletLoader', () => ({
  signInStepsWithSigner: vi.fn(),
  loadSignInSteps: vi.fn(),
}));
vi.mock('../../services/accountsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/accountsService')>()),
  verifyOtp: vi.fn(),
}));
// The passkey offer's screen, which a code sign-in loads before showing it.
vi.mock('../../screens', () => ({ PasskeyOffer: { preload: vi.fn() } }));
vi.mock('../../services/passkeyOffer', () => ({ shouldOfferPasskey: vi.fn() }));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

/** Sentry got one fixed error: nothing of the rejected error's message (a stored key). */
const expectFixedReport = () => {
  expect(captureException).toHaveBeenCalledTimes(1);
  const reported = (captureException as Mock).mock.calls[0][0] as Error;
  expect(reported).toBeInstanceOf(Error);
  expect(reported.message).toBe('Stored wallet session could not be used');
  expect(reported.message).not.toContain('deadbeef-secret');
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
      resetClient: vi.fn(),
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
    const getKernelSigner = vi.fn(() => ({
      subOrganizationId: 'sub',
      hasActiveSession: () => true,
    }));

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
          .mockRejectedValue(new Error('invalid hex string: "deadbeef-secret"')),
      }),
    );
    await expect(auth.validateSession()).resolves.toBeNull();
    expect(setUiState).toHaveBeenCalledWith(UiStates.OTP_INPUT);
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expectFixedReport();
  });

  it('asks for a code again when the stored key can’t be decrypted', async () => {
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    signInAs('sub-a');
    const undecryptable = new Error('invalid hex string: "deadbeef-secret"');
    signer.resolve(
      stepsWith(
        {},
        {
          getApiKeyStamper: vi.fn(() => {
            throw undecryptable;
          }),
        },
      ),
    );
    await expect(auth.validateSession()).resolves.toBeNull();
    expect(setUiState).toHaveBeenCalledWith(UiStates.OTP_INPUT);
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expectFixedReport();
  });

  it('resumeAccount falls back when the stored key can’t be decrypted', async () => {
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    signer.resolve(
      stepsWith(
        {},
        {
          getApiKeyStamper: vi.fn(() => {
            throw new Error('bad bundle');
          }),
        },
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

  it('prompt=login never resumes silently', async () => {
    (useDevCredentials as Mock).mockReturnValue({
      clientId: '0xc',
      redirectUri: 'https://app.example/cb',
      utm: '',
      prompt: 'login',
    });
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    const authenticateUser = vi.fn();
    signer.resolve(stepsWith({}, { authenticateUser }));
    await expect(
      auth.resumeAccount({
        email: 'alice@x.co',
        subOrganizationId: 'sub-a',
        lastUsedAt: 1,
      }),
    ).resolves.toBe(false);
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(localStorage.getItem('turnkey_session_sub-a')).not.toBeNull();
  });

  it('holds what the app asked for until someone signs in on the page', () => {
    (useDevCredentials as Mock).mockReturnValue({
      clientId: '0xc',
      redirectUri: 'https://app.example/cb',
      utm: '',
      prompt: 'select_account',
      loginHint: 'bob@x.co',
    });
    renderProvider();
    expect(auth.accountRequest).toEqual({
      prompt: 'select_account',
      loginHint: 'bob@x.co',
    });

    // A cached session used at the start is a sign-in on this page too.
    act(() => auth.setJwt(JWT));
    expect(auth.accountRequest).toEqual({});
  });

  it('after a sign-in on the page, prompt=login no longer stops a silent resume, even after switchAccount', async () => {
    (useDevCredentials as Mock).mockReturnValue({
      clientId: '0xc',
      redirectUri: 'https://app.example/cb',
      utm: '',
      prompt: 'login',
      loginHint: 'bob@x.co',
    });
    const alice = { email: 'alice@x.co', subOrganizationId: 'sub-a', lastUsedAt: 1 };
    // Remembered, so Bob's sign-in keeps her wallet session.
    localStorage.setItem('dimo_accounts', JSON.stringify([alice]));
    localStorage.setItem('turnkey_session_sub-a', apiKeySession());
    renderProvider();
    const authenticateUser = vi.fn().mockResolvedValue({
      accessToken: JWT,
      walletAddress: '0xw',
      smartContractAddress: '0xs',
      turnkeySessionExpiration: Date.now() + 60_000,
    });
    signer.resolve(stepsWith({}, { authenticateUser }));
    await expect(auth.resumeAccount(alice)).resolves.toBe(false);

    // Bob signs in with his passkey, then picks "Use another account".
    act(() =>
      auth.setUser({ ...auth.user, email: 'bob@x.co', subOrganizationId: 'sub-b' }),
    );
    await act(() => auth.completePasskeyLogin());
    act(() => auth.switchAccount());
    expect(auth.jwt).toBe('');
    expect(auth.accountRequest).toEqual({});

    let resumed: boolean | undefined;
    await act(async () => {
      resumed = await auth.resumeAccount(alice);
    });
    expect(resumed).toBe(true);
    expect(authenticateUser).toHaveBeenLastCalledWith(
      '0xc',
      'https://app.example/cb',
      'sub-a',
      expect.anything(),
    );
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
        {
          authenticateUser: vi
            .fn()
            .mockRejectedValue(new Error('invalid hex string: "deadbeef-secret"')),
        },
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
    expectFixedReport();
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

  it('after switchAccount, signing in as another account returns to the requested screen as that account', async () => {
    (useUIManager as Mock).mockReturnValue({
      setUiState,
      setError,
      entryState: 'VEHICLE_MANAGER',
    });
    localStorage.setItem('turnkey_session_sub-b', apiKeySession());
    renderProvider();
    signInAs('sub-a');
    act(() => auth.switchAccount());
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.EMAIL_INPUT);

    signer.resolve(
      stepsWith(
        {},
        {
          authenticateUser: vi.fn().mockResolvedValue({
            accessToken: JWT,
            walletAddress: '0xbob',
            smartContractAddress: '0xbobsc',
            turnkeySessionExpiration: Date.now() + 60_000,
          }),
        },
      ),
    );
    await act(async () => {
      await auth.resumeAccount({
        email: 'bob@x.co',
        subOrganizationId: 'sub-b',
        lastUsedAt: 1,
      });
    });

    expect(setUiState).toHaveBeenLastCalledWith(UiStates.VEHICLE_MANAGER);
    expect(auth.user.email).toBe('bob@x.co');
    expect(auth.user.smartContractAddress).toBe('0xbobsc');
    expect(auth.jwt).toBe(JWT);
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

  it('openEmailForm drops the relay sign-up and opens the email form once', async () => {
    renderProvider();
    await act(() => auth.signUp.start('x7k2@privaterelay.appleid.com', 'tok'));
    expect(auth.emailFormIntent).toBe(false);
    act(() => auth.openEmailForm());
    expect(auth.signUpDraft).toBeNull();
    expect(auth.user.email).toBe('');
    expect(setError).toHaveBeenCalledWith(null);
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.EMAIL_INPUT);
    expect(auth.emailFormIntent).toBe(true);
    act(() => auth.clearEmailFormIntent());
    expect(auth.emailFormIntent).toBe(false);
  });
});

describe('AuthContext passkey offer', () => {
  const ALICE = {
    email: 'alice@x.co',
    subOrganizationId: 'sub-a',
    hasPasskey: true,
    walletAddress: null,
    smartContractAddress: null,
    emailVerified: true,
    credentialIds: ['cred-1'],
  };
  const offerSteps = (offer: boolean) => {
    vi.mocked(shouldOfferPasskey).mockResolvedValue(offer);
    return stepsWith(
      {},
      {
        generateP256KeyPair: () => ({ publicKeyUncompressed: 'pub', privateKey: 'priv' }),
      },
    );
  };

  beforeEach(() => {
    (useUIManager as Mock).mockReturnValue({
      setUiState,
      setError,
      entryState: 'VEHICLE_MANAGER',
    });
    vi.mocked(verifyOtp).mockResolvedValue({ credentialBundle: 'bundle' } as never);
    vi.mocked(PasskeyOffer.preload).mockResolvedValue({} as never);
  });

  const signInByCode = async (steps: SignInSteps) => {
    renderProvider();
    act(() => auth.setUser(ALICE));
    signer.resolve(steps);
    await act(() => auth.completeOTPLogin({ otpId: 'otp', otpCode: '123456' }));
  };

  it('after a code sign-in, offers a passkey before going on, and goes on once', async () => {
    await signInByCode(offerSteps(true));

    expect(shouldOfferPasskey).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@x.co', subOrganizationId: 'sub-a' }),
    );
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.PASSKEY_OFFER);
    expect(setUiState).not.toHaveBeenCalledWith(UiStates.VEHICLE_MANAGER);
    // Signed in already: the session is made before the offer.
    expect(auth.jwt).toBe(JWT);
    expect(localStorage.getItem('user_data_0xc')).not.toBeNull();

    act(() => auth.continueAfterSignIn());
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.VEHICLE_MANAGER);
    act(() => auth.continueAfterSignIn());
    expect(
      setUiState.mock.calls.filter(([state]) => state === UiStates.VEHICLE_MANAGER),
    ).toHaveLength(1);
  });

  it('goes straight on when there is nothing to offer', async () => {
    await signInByCode(offerSteps(false));
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.VEHICLE_MANAGER);
    expect(setUiState).not.toHaveBeenCalledWith(UiStates.PASSKEY_OFFER);
  });

  it('goes straight on when the offer’s screen can’t load', async () => {
    vi.mocked(PasskeyOffer.preload).mockRejectedValue(new Error('chunk'));
    await signInByCode(offerSteps(true));
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.VEHICLE_MANAGER);
    expect(setUiState).not.toHaveBeenCalledWith(UiStates.PASSKEY_OFFER);
  });

  it('goes straight on when deciding fails', async () => {
    const steps = offerSteps(true);
    vi.mocked(shouldOfferPasskey).mockRejectedValue(new Error('boom'));
    await signInByCode(steps);
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.VEHICLE_MANAGER);
  });

  it('never offers after a passkey sign-in', async () => {
    const steps = offerSteps(true);
    renderProvider();
    act(() => auth.setUser(ALICE));
    signer.resolve(steps);
    await act(() => auth.completePasskeyLogin());
    expect(shouldOfferPasskey).not.toHaveBeenCalled();
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.VEHICLE_MANAGER);
  });

  it('never offers on a silent resume', async () => {
    const steps = offerSteps(true);
    localStorage.setItem(
      'turnkey_session_sub-a',
      JSON.stringify({
        sessionType: 'api_key',
        embeddedKey: 'k',
        credentialBundle: 'b',
        expiresAt: Date.now() + 60_000,
      }),
    );
    renderProvider();
    signer.resolve(steps);
    await act(async () => {
      await auth.resumeAccount({
        email: 'alice@x.co',
        subOrganizationId: 'sub-a',
        lastUsedAt: 1,
      });
    });
    expect(shouldOfferPasskey).not.toHaveBeenCalled();
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.VEHICLE_MANAGER);
  });

  it('continueAfterSignIn does nothing when nothing is waiting', () => {
    renderProvider();
    act(() => auth.continueAfterSignIn());
    expect(setUiState).not.toHaveBeenCalled();
  });

  it('a new sign-in drops a continuation left waiting by an earlier one', async () => {
    await signInByCode(offerSteps(true));
    // "Use another account" from the offer would be a new sign-in: the first
    // sign-in's continuation must never run for the second.
    act(() => auth.switchAccount());
    act(() => auth.continueAfterSignIn());
    expect(setUiState).not.toHaveBeenCalledWith(UiStates.VEHICLE_MANAGER);
  });

  it('keeps the account’s credential IDs out of storage', async () => {
    await signInByCode(offerSteps(false));
    expect(JSON.parse(localStorage.getItem('user_data_0xc')!)).not.toHaveProperty(
      'credentialIds',
    );
    expect(localStorage.getItem('dimo_accounts')).not.toContain('cred-1');
  });
});
