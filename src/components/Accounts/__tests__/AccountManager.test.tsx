/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@dimo-network/transactions', () => ({ Permission: {} }));
const mockShare = vi.fn();
const mockFinish = vi.fn();
vi.mock('../../../hooks/useShareAccounts', () => ({
  useShareAccounts: () => mockShare,
}));
vi.mock('../../../hooks/useFinishShareAccounts', () => ({
  useFinishShareAccounts: () => mockFinish,
}));
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0x2222222222222222222222222222222222222222',
    devLicenseAlias: 'Hanami Rentals',
    redirectUri: 'https://hanami.example/cb',
    utm: '',
    expirationDate: BigInt(Date.parse('2027-10-27T12:00:00Z') / 1000),
  }),
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: { email: 'jun@example.com' } }),
}));
const mockUi = { setUiState: vi.fn(), setBusy: vi.fn() };
vi.mock('../../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
const mockSendError = vi.fn();
vi.mock('../../../utils/errorUtils', () => ({
  sendErrorToParent: (...args: unknown[]) => mockSendError(...args),
}));
vi.mock('../../../utils/authUtils', () => ({ isInvalidSessionError: () => false }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { AccountManager } from '../AccountManager';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('names the documents and how long, then signs on Allow', async () => {
  mockShare.mockResolvedValue(undefined);
  render(<AccountManager />);

  expect(
    screen.getByRole('heading', {
      name: 'Hanami Rentals wants access to your documents',
    }),
  ).toBeInTheDocument();
  expect(screen.getByText('Driver documents')).toBeInTheDocument();
  expect(screen.getByText('Original driver document files')).toBeInTheDocument();
  expect(screen.getByText(/Until Oct 27, 2027/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Allow access' }));
  await waitFor(() => expect(mockFinish).toHaveBeenCalled());
  expect(mockSendError).not.toHaveBeenCalled();
});

it('reports Cancel as a rejection, never as success', () => {
  render(<AccountManager />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(mockSendError).toHaveBeenCalledWith(
    'User cancelled document sharing',
    'https://hanami.example/cb',
    '',
    mockUi.setUiState,
  );
  expect(mockShare).not.toHaveBeenCalled();
});

it('says nothing was shared and shows the reason when signing fails', async () => {
  mockShare.mockRejectedValue(new Error('bundler rejected the operation'));
  render(<AccountManager />);
  fireEvent.click(screen.getByRole('button', { name: 'Allow access' }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Couldn’t share your documents');
  expect(alert).toHaveTextContent('Details: bundler rejected the operation');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(mockFinish).not.toHaveBeenCalled();
});
