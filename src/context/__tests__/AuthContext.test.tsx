import type { Mock } from 'vitest';
import React from 'react';
import { act, render } from '@testing-library/react';

import { AuthProvider, useAuthContext } from '../AuthContext';
import { useDevCredentials } from '../DevCredentialsContext';
import { useUIManager } from '../UIManagerContext';
import { signInStepsWithSigner, type SignInSteps } from '../../services/walletLoader';
import { UiStates } from '../../enums';

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

let setUiState: Mock;
let signer: ReturnType<typeof deferred<SignInSteps>>;

beforeEach(() => {
  // The Vitest config (mockReset) resets mock implementations before each test.
  localStorage.clear();
  setUiState = vi.fn();
  signer = deferred<SignInSteps>();
  (useDevCredentials as Mock).mockReturnValue({
    clientId: '0xc',
    redirectUri: 'https://app.example/cb',
    utm: '',
  });
  (useUIManager as Mock).mockReturnValue({ setUiState, entryState: 'EMAIL_INPUT' });
  (signInStepsWithSigner as Mock).mockReturnValue(signer.promise);
});

describe('AuthContext validateSession', () => {
  it('validateSession waits for the kernel signer before checking the session', async () => {
    localStorage.setItem(
      'turnkey_session',
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
