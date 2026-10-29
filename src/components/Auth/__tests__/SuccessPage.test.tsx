/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockUser = { email: 'jun@example.com', smartContractAddress: '0xabc' };
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUser, jwt: 'jwt' }),
}));
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
    utm: '',
  }),
}));
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setUiState: vi.fn() }),
}));
const mockSendAuth = vi.fn();
vi.mock('../../../utils/authUtils', () => ({
  buildAuthPayload: () => ({ token: 'jwt', walletAddress: '0xabc' }),
  sendAuthPayloadToParent: (...args: unknown[]) => mockSendAuth(...args),
  logout: vi.fn(),
}));
vi.mock('../../../utils/messageHandler', () => ({ backToThirdParty: vi.fn() }));
let mockEmbedded = false;
vi.mock('../../../utils/isEmbed', () => ({ isEmbed: () => mockEmbedded }));

import { SuccessPage } from '../SuccessPage';
import { getEmailChoice } from '../../../services/storageService';

beforeEach(() => {
  vi.clearAllMocks();
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
