import React from 'react';
import { render, act } from '@testing-library/react';
import { useGoToLoginOrSignUp } from '../useGoToLoginOrSignUp';
import { fetchUserDetails } from '../../services/accountsService';
import { UiStates } from '../../enums';

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
  mockFetch.mockResolvedValue({ email: 'a@b.co', subOrganizationId: 's', hasPasskey: true, emailVerified: true } as any);
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
  mockFetch.mockResolvedValue({ email: 'a@b.co', subOrganizationId: 's', hasPasskey: false, emailVerified: false } as any);
  await go('a@b.co');
  expect(start).toHaveBeenCalledWith('a@b.co', undefined);
  expect(setUiState).not.toHaveBeenCalledWith(UiStates.PASSKEY_LOGIN);
});

it('passes a provider token on to sign-up', async () => {
  mockFetch.mockResolvedValue(null);
  await go('a@b.co', 'tok');
  expect(start).toHaveBeenCalledWith('a@b.co', 'tok');
});
