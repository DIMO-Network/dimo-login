/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@dimo-network/transactions', () => ({ Permission: {} }));
const mockShare = jest.fn();
const mockFinish = jest.fn();
jest.mock('../../../hooks/useShareAccounts', () => ({
  useShareAccounts: () => mockShare,
}));
jest.mock('../../../hooks/useFinishShareAccounts', () => ({
  useFinishShareAccounts: () => mockFinish,
}));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0x2222222222222222222222222222222222222222',
    devLicenseAlias: 'Hanami Rentals',
    redirectUri: 'https://hanami.example/cb',
    utm: '',
    expirationDate: BigInt(Date.parse('2027-10-27T12:00:00Z') / 1000),
  }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: { email: 'jun@example.com' } }),
}));
const mockUi = { setUiState: jest.fn(), setBusy: jest.fn() };
jest.mock('../../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
const mockSendError = jest.fn();
jest.mock('../../../utils/errorUtils', () => ({
  sendErrorToParent: (...args: unknown[]) => mockSendError(...args),
}));
jest.mock('../../../utils/authUtils', () => ({ isInvalidSessionError: () => false }));
jest.mock('@sentry/react', () => ({ captureException: jest.fn() }));

import { AccountManager } from '../AccountManager';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
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
