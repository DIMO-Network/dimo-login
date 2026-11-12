import React from 'react';
import { render, act } from '@testing-library/react';
import { captureException } from '@sentry/react';
import { useSignUpFlow, type SignUp, type SignUpDraft } from '../useSignUpFlow';
import { AccountVerifyError } from '../../services/accountsService';
import * as accounts from '../../services/accountsService';
import type { UserObject } from '../../models/user';
import { UiStates } from '../../enums';
import { message } from '../../i18n';

const KEY = { publicKeyUncompressed: 'PUB', privateKey: 'PRIV' };
const ATTESTATION = { att: true };
const USER: UserObject = {
  email: 'a@b.co',
  subOrganizationId: 's',
  hasPasskey: true,
  smartContractAddress: null,
  walletAddress: null,
  emailVerified: true,
};

const setUiState = vi.fn();
const setError = vi.fn();
const setUser = vi.fn();
const mockCreatePasskey = vi.fn();

vi.mock('../../services/accountsService', async () => {
  const actual = await vi.importActual<typeof import('../../services/accountsService')>(
    '../../services/accountsService',
  );
  return {
    ...actual,
    registerAccount: vi.fn(),
    verifyAccountEmail: vi.fn(),
    createAccount: vi.fn(),
    fetchUserDetails: vi.fn(),
  };
});
vi.mock('../../services/walletLoader', () => ({
  loadSignInSteps: async () => ({
    generateP256KeyPair: () => KEY,
    createPasskey: mockCreatePasskey,
  }),
}));
// The screen showing; a test changes it and re-renders to move the flow on.
let mockUiState: UiStates = UiStates.EMAIL_INPUT;
vi.mock('../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setUiState, setError, uiState: mockUiState }),
}));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ apiKey: 'api-key' }),
}));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

const mockRegister = vi.mocked(accounts.registerAccount);
const mockVerify = vi.mocked(accounts.verifyAccountEmail);
const mockCreateAccount = vi.mocked(accounts.createAccount);
const mockFetchUser = vi.mocked(accounts.fetchUserDetails);

let signUp!: SignUp;
let clearDraft!: () => void;
let currentDraft: SignUpDraft | null = null;
const draft = () => currentDraft;

// Probe component: this repo's @testing-library/react has no renderHook.
const Probe = () => {
  ({ draft: currentDraft, clearDraft, signUp } = useSignUpFlow({ setUser }));
  return null;
};

const startedWithCode = async (code: string) => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await run(() => signUp.start('a@b.co'));
  act(() => signUp.submitCode(code));
};

let rerender!: (ui: React.ReactElement) => void;
/** The flow, re-rendered on the given screen (as the shell's Back would show it). */
const showScreen = (state: UiStates) => {
  mockUiState = state;
  act(() => rerender(<Probe />));
};

beforeEach(async () => {
  vi.clearAllMocks();
  mockUiState = UiStates.EMAIL_INPUT;
  mockCreatePasskey.mockResolvedValue([ATTESTATION, 'ch']);
  ({ rerender } = render(<Probe />));
});

const run = async <T,>(fn: () => Promise<T>) => {
  let result!: T;
  await act(async () => {
    result = await fn();
  });
  return result;
};

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

it('start sends a code and opens the code screen', async () => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await run(() => signUp.start('a@b.co'));
  expect(mockRegister).toHaveBeenCalledWith('a@b.co', 'PUB');
  expect(draft()).toEqual({
    kind: 'code',
    email: 'a@b.co',
    otpId: 'otp-1',
    key: KEY,
    sentAt: expect.any(Number),
  });
  expect(setUiState).toHaveBeenCalledWith(UiStates.SIGNUP_VERIFY_EMAIL, {
    setBack: true,
  });
});

it('start with a provider token skips the code', async () => {
  await run(() => signUp.start('a@b.co', 'tok'));
  expect(mockRegister).not.toHaveBeenCalled();
  expect(draft()).toEqual({ kind: 'proof', email: 'a@b.co', proofToken: 'tok' });
  expect(setUiState).toHaveBeenCalledWith(UiStates.PASSKEY_GENERATOR, { setBack: true });
});

describe('an Apple private relay address', () => {
  const RELAY = 'x7k2@privaterelay.appleid.com';

  it('with a provider token, explains the address before the passkey', async () => {
    await run(() => signUp.start(RELAY, 'tok'));
    expect(draft()).toEqual({ kind: 'proof', email: RELAY, proofToken: 'tok' });
    expect(setUiState).toHaveBeenCalledWith(UiStates.SIGNUP_RELAY_NOTICE, {
      setBack: true,
    });
    expect(setUiState).not.toHaveBeenCalledWith(
      UiStates.PASSKEY_GENERATOR,
      expect.anything(),
    );
  });

  it('is recognised whatever its case', async () => {
    await run(() => signUp.start('X7K2@PrivateRelay.AppleID.com', 'tok'));
    expect(setUiState).toHaveBeenCalledWith(UiStates.SIGNUP_RELAY_NOTICE, {
      setBack: true,
    });
  });

  it('confirmRelay goes on to the passkey with the token kept', async () => {
    await run(() => signUp.start(RELAY, 'tok'));
    showScreen(UiStates.SIGNUP_RELAY_NOTICE);
    act(() => signUp.confirmRelay());
    // The notice leaves the Back history: Back from the passkey leads out of sign-up.
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.PASSKEY_GENERATOR, {
      setBack: true,
      removeCurrent: true,
    });
    showScreen(UiStates.PASSKEY_GENERATOR);
    expect(draft()).toEqual({ kind: 'proof', email: RELAY, proofToken: 'tok' });

    mockCreateAccount.mockResolvedValue(USER);
    await run(() => signUp.finish());
    expect(mockCreateAccount).toHaveBeenCalledWith(
      expect.objectContaining({ email: RELAY, proofToken: 'tok' }),
    );
  });

  it('Back from the notice drops the draft and its token', async () => {
    await run(() => signUp.start(RELAY, 'tok'));
    showScreen(UiStates.SIGNUP_RELAY_NOTICE);
    expect(draft()).not.toBeNull();
    showScreen(UiStates.EMAIL_INPUT);
    expect(draft()).toBeNull();
  });

  it('Back after confirming keeps the draft, as for any provider sign-up', async () => {
    await run(() => signUp.start(RELAY, 'tok'));
    showScreen(UiStates.SIGNUP_RELAY_NOTICE);
    act(() => signUp.confirmRelay());
    showScreen(UiStates.PASSKEY_GENERATOR);
    showScreen(UiStates.EMAIL_INPUT);
    expect(draft()).toMatchObject({ email: RELAY, proofToken: 'tok' });
  });

  it('without a token (the email-code path), sends a code as before', async () => {
    mockRegister.mockResolvedValue({ otpId: 'otp-1' });
    await run(() => signUp.start(RELAY));
    expect(setUiState).toHaveBeenCalledWith(UiStates.SIGNUP_VERIFY_EMAIL, {
      setBack: true,
    });
    expect(setUiState).not.toHaveBeenCalledWith(
      UiStates.SIGNUP_RELAY_NOTICE,
      expect.anything(),
    );
  });

  it('another address with a token goes straight to the passkey', async () => {
    await run(() => signUp.start('jun@icloud.com', 'tok'));
    showScreen(UiStates.PASSKEY_GENERATOR);
    showScreen(UiStates.EMAIL_INPUT);
    expect(setUiState).toHaveBeenCalledWith(UiStates.PASSKEY_GENERATOR, {
      setBack: true,
    });
    // Unchanged: Back keeps a provider sign-up's draft.
    expect(draft()).toMatchObject({ email: 'jun@icloud.com' });
  });
});

it('a second start discards the first email’s draft', async () => {
  mockRegister
    .mockResolvedValueOnce({ otpId: 'otp-1' })
    .mockResolvedValueOnce({ otpId: 'otp-2' });
  await run(() => signUp.start('a@b.co'));
  act(() => signUp.submitCode('111111'));
  await run(() => signUp.start('c@d.co'));
  expect(draft()).toMatchObject({
    kind: 'code',
    email: 'c@d.co',
    otpId: 'otp-2',
    key: KEY,
  });
  expect(draft()).not.toHaveProperty('otpCode');
});

it('finish verifies the code with the new passkey, then goes to the passkey prompt', async () => {
  await startedWithCode('123456');
  mockVerify.mockResolvedValue(undefined);
  mockFetchUser.mockResolvedValue(USER);
  await run(() => signUp.finish());
  expect(mockVerify).toHaveBeenCalledWith({
    email: 'a@b.co',
    otpId: 'otp-1',
    otpCode: '123456',
    key: 'PUB',
    attestation: ATTESTATION,
    challenge: 'ch',
  });
  expect(mockCreateAccount).not.toHaveBeenCalled();
  expect(setUser).toHaveBeenCalledWith(USER);
  expect(setUiState).toHaveBeenLastCalledWith(UiStates.PASSKEY_LOGIN);
  expect(draft()).toBeNull();
});

it('a rejected code returns to the code screen with an error and keeps the passkey', async () => {
  await startedWithCode('000000');
  mockVerify.mockRejectedValueOnce(new AccountVerifyError('Invalid OTP code'));
  await run(() => signUp.finish());
  expect(setError).toHaveBeenCalledWith(message('signup.error.code'));
  // Back still leads out of sign-up.
  expect(setUiState).toHaveBeenLastCalledWith(UiStates.SIGNUP_VERIFY_EMAIL, {
    setBack: true,
    removeCurrent: true,
  });
  expect(captureException).not.toHaveBeenCalled();
  expect(draft()).toMatchObject({ otpCode: undefined, passkey: [ATTESTATION, 'ch'] });
  act(() => signUp.submitCode('123456'));
  mockVerify.mockResolvedValue(undefined);
  mockFetchUser.mockResolvedValue(USER);
  await run(() => signUp.finish());
  expect(mockCreatePasskey).toHaveBeenCalledTimes(1);
});

it('keeps the passkey in the draft when the network call fails', async () => {
  await startedWithCode('123456');
  mockVerify.mockRejectedValueOnce(new Error('network'));
  await run(async () => {
    await expect(signUp.finish()).rejects.toThrow('network');
  });
  expect(draft()?.passkey).toEqual([ATTESTATION, 'ch']);
});

it('finish for a provider sign-up sends the token as proof', async () => {
  await run(() => signUp.start('a@b.co', 'tok'));
  mockCreateAccount.mockResolvedValue(USER);
  await run(() => signUp.finish());
  expect(mockCreateAccount).toHaveBeenCalledWith(
    expect.objectContaining({
      email: 'a@b.co',
      apiKey: 'api-key',
      proofToken: 'tok',
      deployAccount: true,
    }),
  );
  expect(mockVerify).not.toHaveBeenCalled();
  // The account it answers with is the one signed in.
  expect(mockFetchUser).not.toHaveBeenCalled();
  expect(setUser).toHaveBeenCalledWith(USER);
  expect(setUiState).toHaveBeenLastCalledWith(UiStates.PASSKEY_LOGIN);
  expect(draft()).toBeNull();
});

it('resend replaces the code id, forgets the typed code and restarts the wait', async () => {
  await startedWithCode('111111');
  const started = draft();
  const sentAt = started?.kind === 'code' ? started.sentAt : 0;
  mockRegister.mockResolvedValue({ otpId: 'otp-2' });
  vi.spyOn(Date, 'now').mockReturnValue(sentAt + 45_000);
  await run(() => signUp.resend());
  vi.mocked(Date.now).mockRestore();
  expect(draft()).toMatchObject({
    otpId: 'otp-2',
    otpCode: undefined,
    sentAt: sentAt + 45_000,
  });
});

it('a resend keeps what happened while it was on its way', async () => {
  await startedWithCode('111111');
  const sent = deferred<{ otpId: string }>();
  mockRegister.mockReturnValueOnce(sent.promise);
  let resending!: Promise<void>;
  await run(async () => {
    resending = signUp.resend();
  });
  // Meanwhile the passkey is made and the code rejected.
  mockVerify.mockRejectedValueOnce(new AccountVerifyError('Invalid OTP code'));
  await run(() => signUp.finish());
  await run(async () => {
    sent.resolve({ otpId: 'otp-2' });
    await resending;
  });
  expect(draft()).toMatchObject({
    otpId: 'otp-2',
    otpCode: undefined,
    passkey: [ATTESTATION, 'ch'],
  });
  act(() => signUp.submitCode('222222'));
  mockVerify.mockResolvedValue(undefined);
  mockFetchUser.mockResolvedValue(USER);
  await run(() => signUp.finish());
  expect(mockCreatePasskey).toHaveBeenCalledTimes(1);
  expect(mockVerify).toHaveBeenLastCalledWith(
    expect.objectContaining({ otpId: 'otp-2', otpCode: '222222' }),
  );
});

it('a code a resend replaced goes back for the new one', async () => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await run(() => signUp.start('a@b.co'));
  const sent = deferred<{ otpId: string }>();
  mockRegister.mockReturnValueOnce(sent.promise);
  let resending!: Promise<void>;
  await run(async () => {
    resending = signUp.resend();
  });
  act(() => signUp.submitCode('111111'));
  await run(async () => {
    sent.resolve({ otpId: 'otp-2' });
    await resending;
  });
  await run(() => signUp.finish());
  expect(mockVerify).not.toHaveBeenCalled();
  expect(setError).toHaveBeenCalledWith(message('signup.error.code'));
  expect(setUiState).toHaveBeenLastCalledWith(UiStates.SIGNUP_VERIFY_EMAIL, {
    setBack: true,
    removeCurrent: true,
  });
});

describe('a sign-up the server finished although the call failed', () => {
  const UNVERIFIED: UserObject = { ...USER, hasPasskey: false, emailVerified: false };

  it('is recognised when the code is retried', async () => {
    await startedWithCode('123456');
    const alreadyVerified = new AccountVerifyError('Email already verified');
    mockVerify.mockRejectedValueOnce(alreadyVerified);
    mockFetchUser.mockResolvedValue(USER);
    await run(() => signUp.finish());
    expect(mockFetchUser).toHaveBeenCalledWith('a@b.co');
    expect(setUser).toHaveBeenCalledWith(USER);
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.PASSKEY_LOGIN);
    expect(setError).not.toHaveBeenCalled();
    expect(draft()).toBeNull();
    expect(captureException).toHaveBeenCalledWith(alreadyVerified);
  });

  it('is recognised on the provider path', async () => {
    await run(() => signUp.start('a@b.co', 'tok'));
    mockCreateAccount.mockRejectedValueOnce(new Error('Failed to create account'));
    mockFetchUser.mockResolvedValue(USER);
    await run(() => signUp.finish());
    expect(setUser).toHaveBeenCalledWith(USER);
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.PASSKEY_LOGIN);
    expect(draft()).toBeNull();
  });

  it('is not assumed when the account is still unverified', async () => {
    await startedWithCode('000000');
    mockVerify.mockRejectedValueOnce(new AccountVerifyError('Invalid OTP code'));
    mockFetchUser.mockResolvedValue(UNVERIFIED);
    await run(() => signUp.finish());
    expect(setUser).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith(message('signup.error.code'));
    expect(setUiState).toHaveBeenLastCalledWith(UiStates.SIGNUP_VERIFY_EMAIL, {
      setBack: true,
      removeCurrent: true,
    });
  });

  it('leaves the original failure when the account cannot be read', async () => {
    await run(() => signUp.start('a@b.co', 'tok'));
    mockCreateAccount.mockRejectedValueOnce(new Error('Failed to create account'));
    mockFetchUser.mockRejectedValue(new Error('down'));
    await run(async () => {
      await expect(signUp.finish()).rejects.toThrow('Failed to create account');
    });
    expect(setUser).not.toHaveBeenCalled();
  });
});

it('a double finish makes one passkey and one submit', async () => {
  await startedWithCode('123456');
  mockVerify.mockResolvedValue(undefined);
  mockFetchUser.mockResolvedValue(USER);
  await run(() => Promise.all([signUp.finish(), signUp.finish()]));
  expect(mockCreatePasskey).toHaveBeenCalledTimes(1);
  expect(mockVerify).toHaveBeenCalledTimes(1);
});

it('a late response from an older start does not replace the newer draft', async () => {
  const first = deferred<{ otpId: string }>();
  mockRegister
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce({ otpId: 'otp-c' });
  let startA!: Promise<void>;
  await run(async () => {
    startA = signUp.start('a@b.co');
  });
  await run(() => signUp.start('c@d.co'));
  await run(async () => {
    first.resolve({ otpId: 'otp-a' });
    await startA;
  });
  expect(draft()).toEqual({
    kind: 'code',
    email: 'c@d.co',
    otpId: 'otp-c',
    key: KEY,
    sentAt: expect.any(Number),
  });
  expect(setUiState).toHaveBeenCalledTimes(1);
});

it('a late resend does not change a newer draft', async () => {
  await startedWithCode('111111');
  const late = deferred<{ otpId: string }>();
  mockRegister
    .mockReturnValueOnce(late.promise)
    .mockResolvedValueOnce({ otpId: 'otp-c' });
  let resending!: Promise<void>;
  await run(async () => {
    resending = signUp.resend();
  });
  await run(() => signUp.start('c@d.co'));
  await run(async () => {
    late.resolve({ otpId: 'otp-late' });
    await resending;
  });
  expect(draft()).toEqual({
    kind: 'code',
    email: 'c@d.co',
    otpId: 'otp-c',
    key: KEY,
    sentAt: expect.any(Number),
  });
});

it('a finish for a newer sign-up never gets the older one’s result', async () => {
  const firstPasskey = deferred<[object, string]>();
  mockCreatePasskey.mockReturnValueOnce(firstPasskey.promise);
  await run(() => signUp.start('a@b.co', 'tok-a'));
  let finishA!: Promise<void>;
  await run(async () => {
    finishA = signUp.finish();
  });
  await run(() => signUp.start('c@d.co', 'tok-c'));
  mockCreateAccount.mockResolvedValue(USER);
  mockFetchUser.mockResolvedValue(USER);
  const finishC = signUp.finish();
  expect(finishC).not.toBe(finishA);
  await run(async () => {
    await finishC;
    firstPasskey.resolve([ATTESTATION, 'ch-a']);
    await finishA;
  });
  expect(mockCreatePasskey).toHaveBeenCalledTimes(2);
  expect(mockCreateAccount).toHaveBeenCalledTimes(1);
  expect(mockCreateAccount).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'c@d.co', proofToken: 'tok-c' }),
  );
});

it('a sign-up that succeeds after a newer one started changes nothing', async () => {
  const created = deferred<UserObject>();
  await run(() => signUp.start('a@b.co', 'tok'));
  mockCreateAccount.mockReturnValueOnce(created.promise);
  mockFetchUser.mockResolvedValue(USER);
  let finishA!: Promise<void>;
  await run(async () => {
    finishA = signUp.finish();
  });
  await vi.waitFor(() => expect(mockCreateAccount).toHaveBeenCalled());
  mockRegister.mockResolvedValue({ otpId: 'otp-c' });
  await run(() => signUp.start('c@d.co'));
  setUiState.mockClear();
  await run(async () => {
    created.resolve(USER);
    await finishA;
  });
  expect(setUser).not.toHaveBeenCalled();
  expect(setUiState).not.toHaveBeenCalled();
  expect(draft()).toMatchObject({ email: 'c@d.co', otpId: 'otp-c' });
});

it('clearDraft drops a sign-up still waiting for its code to be sent', async () => {
  const sent = deferred<{ otpId: string }>();
  mockRegister.mockReturnValueOnce(sent.promise);
  let starting!: Promise<void>;
  await run(async () => {
    starting = signUp.start('a@b.co');
  });
  act(() => clearDraft());
  await run(async () => {
    sent.resolve({ otpId: 'otp-1' });
    await starting;
  });
  expect(draft()).toBeNull();
  expect(setUiState).not.toHaveBeenCalled();
});

it('a verify error on the provider path propagates', async () => {
  await run(() => signUp.start('a@b.co', 'tok'));
  mockCreateAccount.mockRejectedValueOnce(new AccountVerifyError('nope'));
  await run(async () => {
    await expect(signUp.finish()).rejects.toThrow('nope');
  });
  expect(setUiState).not.toHaveBeenCalledWith(UiStates.SIGNUP_VERIFY_EMAIL);
});
