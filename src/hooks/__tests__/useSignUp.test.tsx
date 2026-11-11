import React, { useState } from 'react';
import { render, act } from '@testing-library/react';
import { useSignUp } from '../useSignUp';
import { AccountVerifyError } from '../../services/accountsService';
import * as accounts from '../../services/accountsService';
import type { SignUpDraft } from '../../context/AuthContext';
import { UiStates } from '../../enums';

const KEY = { publicKeyUncompressed: 'PUB', privateKey: 'PRIV' };
const ATTESTATION = { att: true };
const USER = { email: 'a@b.co', subOrganizationId: 's' };

const setUiState = vi.fn();
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
vi.mock('../../context/UIManagerContext', () => ({ useUIManager: () => ({ setUiState }) }));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ apiKey: 'api-key' }),
}));

// A small state holder standing in for AuthProvider.
let auth: { signUpDraft: SignUpDraft | null; setSignUpDraft: any; setUser: any };
vi.mock('../../context/AuthContext', () => ({ useAuthContext: () => auth }));

const mockRegister = vi.mocked(accounts.registerAccount);
const mockVerify = vi.mocked(accounts.verifyAccountEmail);
const mockCreateAccount = vi.mocked(accounts.createAccount);
const mockFetchUser = vi.mocked(accounts.fetchUserDetails);

let signUp!: ReturnType<typeof useSignUp>;
let currentDraft: SignUpDraft | null = null;
const draft = () => currentDraft;

const Probe = () => {
  const [d, setD] = useState<SignUpDraft | null>(null);
  currentDraft = d;
  auth = { signUpDraft: d, setSignUpDraft: setD, setUser };
  signUp = useSignUp();
  return null;
};

const startedWithCode = async (code: string) => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await signUp.start('a@b.co');
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

it('start sends a code and opens the code screen', async () => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await run(() => signUp.start('a@b.co'));
  expect(mockRegister).toHaveBeenCalledWith('a@b.co', 'PUB');
  expect(draft()).toEqual({ email: 'a@b.co', otpId: 'otp-1', key: KEY });
  expect(setUiState).toHaveBeenCalledWith(UiStates.SIGNUP_VERIFY_EMAIL, { setBack: true });
});

it('start with a provider token skips the code', async () => {
  await run(() => signUp.start('a@b.co', 'tok'));
  expect(mockRegister).not.toHaveBeenCalled();
  expect(setUiState).toHaveBeenCalledWith(UiStates.PASSKEY_GENERATOR, { setBack: true });
});

it('a second start discards the first email’s draft', async () => {
  mockRegister.mockResolvedValueOnce({ otpId: 'otp-1' }).mockResolvedValueOnce({ otpId: 'otp-2' });
  await run(() => signUp.start('a@b.co'));
  act(() => signUp.submitCode('111111'));
  await run(() => signUp.start('c@d.co'));
  expect(draft()).toEqual({ email: 'c@d.co', otpId: 'otp-2', key: KEY });
});

it('finish verifies the code with the new passkey, then goes to the passkey prompt', async () => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await run(() => signUp.start('a@b.co'));
  mockVerify.mockResolvedValue(undefined);
  mockFetchUser.mockResolvedValue(USER as any);
  await run(async () => {
    signUp.submitCode('123456');
    return expect(signUp.finish()).resolves.toBe('done');
  });
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

it('a rejected code returns to the code screen and keeps the passkey', async () => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await run(() => signUp.start('a@b.co'));
  mockVerify.mockRejectedValueOnce(new AccountVerifyError('Invalid OTP code'));
  await run(async () => {
    signUp.submitCode('000000');
    return expect(signUp.finish()).resolves.toBe('code_rejected');
  });
  expect(setUiState).toHaveBeenLastCalledWith(UiStates.SIGNUP_VERIFY_EMAIL);
  expect(draft()?.otpCode).toBeUndefined();
  act(() => signUp.submitCode('123456'));
  mockVerify.mockResolvedValue(undefined);
  mockFetchUser.mockResolvedValue(USER as any);
  await run(() => signUp.finish());
  expect(mockCreatePasskey).toHaveBeenCalledTimes(1);
});

it('keeps the passkey in the draft when the network call fails', async () => {
  mockRegister.mockResolvedValue({ otpId: 'otp-1' });
  await run(() => signUp.start('a@b.co'));
  mockVerify.mockRejectedValueOnce(new Error('network'));
  await run(async () => {
    signUp.submitCode('123456');
    return expect(signUp.finish()).rejects.toThrow('network');
  });
  expect(draft()?.passkey).toEqual([ATTESTATION, 'ch']);
});

it('finish for a provider sign-up sends the token as proof', async () => {
  await run(() => signUp.start('a@b.co', 'tok'));
  mockCreateAccount.mockResolvedValue(USER as any);
  mockFetchUser.mockResolvedValue(USER as any);
  await run(() => signUp.finish());
  expect(mockCreateAccount).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'a@b.co', apiKey: 'api-key', proofToken: 'tok', deployAccount: true }),
  );
  expect(mockVerify).not.toHaveBeenCalled();
});

it('resend replaces the code id and forgets the typed code', async () => {
  await startedWithCode('111111');
  mockRegister.mockResolvedValue({ otpId: 'otp-2' });
  await run(() => signUp.resend());
  expect(draft()).toMatchObject({ otpId: 'otp-2', otpCode: undefined });
});
