/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockUser = { email: 'jun@example.com', smartContractAddress: '0xabc' };
jest.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUser, jwt: 'jwt' }),
}));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
    utm: '',
  }),
}));
jest.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setUiState: jest.fn() }),
}));
const mockSendAuth = jest.fn();
jest.mock('../../../utils/authUtils', () => ({
  buildAuthPayload: () => ({ token: 'jwt', walletAddress: '0xabc' }),
  sendAuthPayloadToParent: (...args: unknown[]) => mockSendAuth(...args),
  logout: jest.fn(),
}));
jest.mock('../../../utils/messageHandler', () => ({ backToThirdParty: jest.fn() }));
let mockEmbedded = false;
jest.mock('../../../utils/isEmbed', () => ({ isEmbed: () => mockEmbedded }));

import { SuccessPage } from '../SuccessPage';
import { getEmailChoice } from '../../../services/storageService';

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockEmbedded = false;
});

it('asks about the email on the way back to the app, and remembers the answer', () => {
  render(<SuccessPage />);
  fireEvent.click(screen.getByRole('switch', { name: /Share my email with Acme/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Back to Acme' }));

  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);
  expect(mockSendAuth).toHaveBeenCalled();
});

it('shows no email switch when embedded, where nothing would send the answer', () => {
  mockEmbedded = true;
  render(<SuccessPage />);

  expect(screen.queryByRole('switch')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Back to Acme' })).toBeNull();
});
