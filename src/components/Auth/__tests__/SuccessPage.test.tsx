/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockUser = { email: 'jun@example.com', smartContractAddress: '0xabc' };
const mockSwitch = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUser, jwt: 'jwt', switchAccount: mockSwitch }),
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
const mockBuild = vi.fn();
vi.mock('../../../utils/authUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/authUtils')>()),
  buildAuthPayload: (...args: unknown[]) => mockBuild(...args),
  sendAuthPayloadToParent: (...args: unknown[]) => mockSendAuth(...args),
  logout: vi.fn(),
}));
vi.mock('../../../utils/messageHandler', () => ({ backToThirdParty: vi.fn() }));
let mockEmbedded = false;
vi.mock('../../../utils/isEmbed', () => ({ isEmbed: () => mockEmbedded }));

import { SuccessPage } from '../SuccessPage';
import { getEmailChoice } from '../../../services/storageService';
import { TOKEN_EXPIRED_ERROR } from '../../../utils/authUtils';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockEmbedded = false;
  mockBuild.mockReturnValue({ token: 'jwt', walletAddress: '0xabc' });
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

it('signs in again instead of going back with a token that has run out', () => {
  mockBuild.mockImplementation(() => {
    throw new Error(TOKEN_EXPIRED_ERROR);
  });
  render(<SuccessPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to Acme' }));

  expect(mockSendAuth).not.toHaveBeenCalled();
  expect(mockSwitch).toHaveBeenCalledTimes(1);
});
