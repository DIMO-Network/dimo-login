/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockUser = { email: 'jun@example.com', smartContractAddress: '0xabc' };
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ user: mockUser, jwt: 'jwt' }),
}));
const mockCreds: Record<string, unknown> = {};
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
    utm: '',
    ...mockCreds,
  }),
}));
const mockUi = { setUiState: vi.fn() };
vi.mock('../../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
const mockSendLogin = vi.fn();
vi.mock('../../../utils/authUtils', () => ({
  sendLoginToApp: (...args: unknown[]) => mockSendLogin(...args),
}));
const mockSendError = vi.fn();
vi.mock('../../../utils/errorUtils', () => ({
  sendErrorToParent: (...args: unknown[]) => mockSendError(...args),
}));

import { EmailConsent } from '../EmailConsent';
import { getEmailChoice } from '../../../services/storageService';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.keys(mockCreds).forEach((key) => delete mockCreds[key]);
});

it('lets the user continue without sharing an optional email, and remembers it', () => {
  render(<EmailConsent />);
  expect(screen.getByRole('heading', { name: 'Continue to Acme' })).toBeInTheDocument();
  expect(
    screen.getByText(
      'Acme would like your email address. You can continue without sharing it.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('switch', { name: /Share my email with Acme/ }),
  ).toHaveAttribute('aria-checked', 'false');

  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(false);
  expect(mockSendLogin).toHaveBeenCalledWith(
    expect.objectContaining({ clientId: mockClientId, jwt: 'jwt', user: mockUser }),
  );
});

it('shares an optional email when switched on', () => {
  render(<EmailConsent />);
  fireEvent.click(screen.getByRole('switch', { name: /Share my email with Acme/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);
});

it('a required email is shared by continuing, or the login is cancelled', () => {
  mockCreds.emailRequest = 'required';
  render(<EmailConsent />);
  expect(
    screen.getByText('Acme needs your email address to continue.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('switch')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(mockSendError).toHaveBeenCalledWith(
    'User declined to share their email',
    'https://acme.example/callback',
    '',
    mockUi.setUiState,
  );
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBeUndefined();

  fireEvent.click(screen.getByRole('button', { name: 'Share and continue' }));
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);
  expect(mockSendLogin).toHaveBeenCalled();
});
