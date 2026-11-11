import React from 'react';
import { render, act } from '@testing-library/react';
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
vi.mock('../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setUiState, setError }),
}));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ apiKey: 'api-key' }),
}));

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

beforeEach(async () => {
  vi.clearAllMocks();
  mockCreatePasskey.mockResolvedValue([ATTESTATION, 'ch']);
  render(<Probe />);
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
  expect(draft()).toEqual({ kind: 'code', email: 'a@b.co', otpId: 'otp-1', key: KEY });
  expect(setUiState).toHaveBeenCalledWith(UiStates.SIGNUP_VERIFY_EMAIL, { setBack: true });
});

it('start with a provider token skips the code', async () => {
  await run(() => signUp.start('a@b.co', 'tok'));
  expect(mockRegister).not.toHaveBeenCalled();
  expect(draft()).toEqual({ kind: 'proof', email: 'a@b.co', proofToken: 'tok' });
  expect(setUiState).toHaveBeenCalledWith(UiStates.PASSKEY_GENERATOR, { setBack: true });
});

it('a second start discards the first email’s draft', async () => {
  mockRegister.mockResolvedValueOnce({ otpId: 'otp-1' }).mockResolvedValueOnce({ otpId: 'otp-2' });
  await run(() => signUp.start('a@b.co'));
  act(() => signUp.submitCode('111111'));
  await run(() => signUp.start('c@d.co'));
  expect(draft()).toEqual({ kind: 'code', email: 'c@d.co', otpId: 'otp-2', key: KEY });
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
  expect(setUser).toHaveBeenCalledWith(USER);
  expect(setUiState).toHaveBeenLastCalledWith(UiStates.PASSKEY_LOGIN);
  expect(draft()).toBeNull();
});

it('a rejected code returns to the code screen with an error and keeps the passkey', async () => {
  await startedWithCode('000000');
  mockVerify.mockRejectedValueOnce(new AccountVerifyError('Invalid OTP code'));
  await run(() => signUp.finish());
  expect(setError).toHaveBeenCalledWith(message('signup.error.code'));
  expect(setUiState).toHaveBeenLastCalledWith(UiStates.SIGNUP_VERIFY_EMAIL);
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
  mockFetchUser.mockResolvedValue(USER);
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
});

it('resend replaces the code id and forgets the typed code', async () => {
  await startedWithCode('111111');
  mockRegister.mockResolvedValue({ otpId: 'otp-2' });
  await run(() => signUp.resend());
  expect(draft()).toMatchObject({ otpId: 'otp-2', otpCode: undefined });
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
  mockRegister.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ otpId: 'otp-c' });
  let startA!: Promise<void>;
  await run(async () => {
    startA = signUp.start('a@b.co');
  });
  await run(() => signUp.start('c@d.co'));
  await run(async () => {
    first.resolve({ otpId: 'otp-a' });
    await startA;
  });
  expect(draft()).toEqual({ kind: 'code', email: 'c@d.co', otpId: 'otp-c', key: KEY });
  expect(setUiState).toHaveBeenCalledTimes(1);
});

it('a late resend does not change a newer draft', async () => {
  await startedWithCode('111111');
  const late = deferred<{ otpId: string }>();
  mockRegister.mockReturnValueOnce(late.promise).mockResolvedValueOnce({ otpId: 'otp-c' });
  let resending!: Promise<void>;
  await run(async () => {
    resending = signUp.resend();
  });
  await run(() => signUp.start('c@d.co'));
  await run(async () => {
    late.resolve({ otpId: 'otp-late' });
    await resending;
  });
  expect(draft()).toEqual({ kind: 'code', email: 'c@d.co', otpId: 'otp-c', key: KEY });
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
