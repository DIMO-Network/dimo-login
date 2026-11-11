import React from 'react';
import { render, act } from '@testing-library/react';
import { useGoToLoginOrSignUp } from '../useGoToLoginOrSignUp';
import { fetchUserDetails } from '../../services/accountsService';
import type { UserObject } from '../../models/user';
import { UiStates } from '../../enums';

const VERIFIED: UserObject = {
  email: 'a@b.co',
  subOrganizationId: 's',
  hasPasskey: true,
  smartContractAddress: null,
  walletAddress: null,
  emailVerified: true,
};
const UNVERIFIED: UserObject = { ...VERIFIED, hasPasskey: false, emailVerified: false };

const setUser = vi.fn();
const setUiState = vi.fn();
const start = vi.fn();

vi.mock('../../services/accountsService', () => ({ fetchUserDetails: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuthContext: () => ({ setUser }) }));
vi.mock('../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setUiState }),
}));
vi.mock('../useSignUp', () => ({ useSignUp: () => ({ start }) }));

const mockFetch = vi.mocked(fetchUserDetails);

// Probe component: this repo's @testing-library/react has no renderHook.
const go = async (email: string, proofToken?: string) => {
  let fn!: ReturnType<typeof useGoToLoginOrSignUp>;
  const Probe = () => {
    fn = useGoToLoginOrSignUp();
    return null;
  };
  render(<Probe />);
  await act(async () => {
    await fn(email, proofToken);
  });
};

beforeEach(() => vi.clearAllMocks());

it('sends a verified account to the passkey prompt', async () => {
  mockFetch.mockResolvedValue(VERIFIED);
  await go('a@b.co');
  expect(setUser).toHaveBeenCalled();
  expect(setUiState).toHaveBeenCalledWith(UiStates.PASSKEY_LOGIN);
  expect(start).not.toHaveBeenCalled();
});

it('starts sign-up for an unknown email', async () => {
  mockFetch.mockResolvedValue(null);
  await go('a@b.co');
  expect(start).toHaveBeenCalledWith('a@b.co', undefined);
});

it('resumes sign-up for an account whose email was never verified', async () => {
  mockFetch.mockResolvedValue(UNVERIFIED);
  await go('a@b.co');
  expect(start).toHaveBeenCalledWith('a@b.co', undefined);
  expect(setUiState).not.toHaveBeenCalledWith(UiStates.PASSKEY_LOGIN);
});

it('passes a provider token on to sign-up', async () => {
  mockFetch.mockResolvedValue(null);
  await go('a@b.co', 'tok');
  expect(start).toHaveBeenCalledWith('a@b.co', 'tok');
});

it('finishes an unverified account with an emailed code, even with a provider token', async () => {
  // The server only creates brand-new accounts from a provider token.
  mockFetch.mockResolvedValue(UNVERIFIED);
  await go('a@b.co', 'tok');
  expect(start).toHaveBeenCalledWith('a@b.co', undefined);
});
