/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockCredentials: Record<string, unknown> = {};
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => mockCredentials,
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { email: 'dev@example.com', smartContractAddress: '0xAAAA' },
    validateSession: async () => true,
  }),
}));
jest.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setUiState: jest.fn() }),
}));
const mockMint = jest.fn();
const mockBatch = jest.fn();
jest.mock('../../../services/turnkeyService', () => ({
  executeTransactionWithReceipt: (...args: unknown[]) => mockMint(...args),
  executeBatchTransactions: (...args: unknown[]) => mockBatch(...args),
}));
const mockGetLicense = jest.fn();
const mockFirstOwned = jest.fn();
jest.mock('../../../services/identityService', () => ({
  getDeveloperLicense: (...args: unknown[]) => mockGetLicense(...args),
  getFirstOwnedDeveloperLicense: (...args: unknown[]) => mockFirstOwned(...args),
}));
const mockSend = jest.fn();
jest.mock('../../../utils/messageHandler', () => ({
  sendMessageToReferrer: (...args: unknown[]) => mockSend(...args),
  backToThirdParty: jest.fn(),
}));
jest.mock('viem/accounts', () => ({
  generatePrivateKey: () => `0x${'11'.repeat(32)}`,
  privateKeyToAccount: () => ({ address: '0x5150000000000000000000000000000000000000' }),
}));
jest.mock('@sentry/react', () => ({ captureException: jest.fn() }));

import { ProvisionDeveloperLicense } from '../ProvisionDeveloperLicense';

const setCredentials = (values: Record<string, unknown>) => {
  Object.keys(mockCredentials).forEach((key) => delete mockCredentials[key]);
  Object.assign(mockCredentials, {
    redirectUri: 'https://tools.example/callback',
    utm: '',
    devLicenseAlias: 'Tools',
    ...values,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFirstOwned.mockResolvedValue(null);
  mockMint.mockResolvedValue({ logs: [] });
  mockBatch.mockResolvedValue(undefined);
});

it('names who asks and signs nothing until Continue', async () => {
  setCredentials({});
  render(<ProvisionDeveloperLicense />);

  expect(
    await screen.findByText('tools.example is asking for API access'),
  ).toBeInTheDocument();
  expect(mockMint).not.toHaveBeenCalled();
  expect(mockBatch).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(mockMint).toHaveBeenCalled());
});

it('asks before giving a new key for an existing license, and names the redirect address', async () => {
  setCredentials({ existingTokenId: 7, existingClientId: '0xC11E' });
  mockGetLicense.mockResolvedValue({
    owner: '0xaaaa',
    alias: 'Acme Fleet',
    redirectURIs: { nodes: [{ uri: 'https://acme.example/callback' }] },
  });
  render(<ProvisionDeveloperLicense />);

  expect(
    await screen.findByText(
      'If you continue, tools.example gets a new API key for your license Acme Fleet.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'https://tools.example/callback is also added as a redirect address.',
    ),
  ).toBeInTheDocument();
  expect(mockBatch).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(mockBatch).toHaveBeenCalled());
  const calls = mockBatch.mock.calls[0][0] as Array<{ functionName: string }>;
  expect(calls.map((c) => c.functionName)).toEqual(['enableSigner', 'setRedirectUri']);
  expect(mockSend).toHaveBeenCalledWith(
    expect.objectContaining({
      eventType: 'provisionResponse',
      privateKey: '11'.repeat(32),
    }),
    'https://tools.example/callback',
  );
});

it("refuses a license that isn't the user's, with nothing to retry", async () => {
  setCredentials({ existingTokenId: 7, existingClientId: '0xC11E' });
  mockGetLicense.mockResolvedValue({
    owner: '0xBBBB',
    alias: 'Someone else',
    redirectURIs: { nodes: [] },
  });
  render(<ProvisionDeveloperLicense />);

  expect(await screen.findByText(/isn’t in your account/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  // No "Setting up…" progress under an error for a setup that never started.
  expect(screen.queryByRole('status')).toBeNull();
  expect(mockBatch).not.toHaveBeenCalled();
});

it('needs a redirect URI to send the key to', async () => {
  setCredentials({ redirectUri: '' });
  render(<ProvisionDeveloperLicense />);

  expect(
    await screen.findByText(/didn’t say where to send the API key/),
  ).toBeInTheDocument();
  expect(mockMint).not.toHaveBeenCalled();
});

it('tells the app when the user cancels', async () => {
  setCredentials({});
  render(<ProvisionDeveloperLicense />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

  expect(mockSend).toHaveBeenCalledWith({
    eventType: 'DIMO_ERROR',
    message: 'User cancelled developer license setup',
  });
  expect(mockMint).not.toHaveBeenCalled();
});
