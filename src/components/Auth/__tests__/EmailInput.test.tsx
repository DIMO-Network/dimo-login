/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockGo = vi.fn();
let mockOAuthUrl: string | null = 'https://accounts.example/oauth';
let mockOnExchangeSuccess: ((token: string) => unknown) | undefined;
vi.mock('../../../hooks/useOAuthCodeExchange', () => ({
  useOAuthCodeExchange: (options: { onSuccess: (token: string) => unknown }) => {
    mockOnExchangeSuccess = options.onSuccess;
    return { isExchanging: false };
  },
}));
vi.mock('../../../hooks/useConstructOAuthUrl', () => ({
  useConstructOAuthUrl: () => () => mockOAuthUrl,
}));
vi.mock('../../../hooks/useGoToLoginOrSignUp', () => ({
  useGoToLoginOrSignUp: () => mockGo,
}));
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
  }),
}));
const mockUi = {
  error: null,
  setError: vi.fn(),
  altTitle: false,
  setLoadingState: vi.fn(),
  setUiState: vi.fn(),
};
vi.mock('../../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
vi.mock('../../Shared/ErrorMessage', () => ({
  ErrorMessage: () => null,
}));
vi.mock('../../Shared/Loader', () => ({
  Loader: () => null,
  UIManagerLoaderWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
const mockSendError = vi.fn();
vi.mock('../../../utils/errorUtils', () => ({
  sendErrorToParent: (...args: unknown[]) => mockSendError(...args),
}));

import { EmailInput } from '../EmailInput';
import { setForceEmail } from '../../../stores/AuthStateStore';
import { getEmailChoice } from '../../../services/storageService';

const onSubmit = vi.fn();

// An unsigned JWT: only the payload matters to the screen.
const b64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwtWith = (payload: object) => `${b64url({ alg: 'none' })}.${b64url(payload)}.sig`;

const exchangeSucceedsWith = async (token: string) => {
  render(<EmailInput onSubmit={onSubmit} />);
  await act(async () => {
    await mockOnExchangeSuccess!(token);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setForceEmail(false);
  mockGo.mockResolvedValue(undefined);
  mockOAuthUrl = 'https://accounts.example/oauth';
});

it("doesn't leave for Google when the return couldn't be checked", () => {
  // Storage blocked: no flow reference, so the return would look forged.
  mockOAuthUrl = null;
  render(<EmailInput onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: /Google/ }));

  expect(mockUi.setError).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'signin.error.storage' }),
  );
});

it('signs in with the email as typed on a Japanese keyboard', async () => {
  render(<EmailInput onSubmit={onSubmit} />);
  expect(screen.getByRole('heading', { name: 'Sign in with DIMO' })).toBeInTheDocument();
  expect(screen.getByText('to continue to Acme')).toBeInTheDocument();
  expect(screen.getByText('acme.example')).toBeInTheDocument();

  // Full-width letters and ＠ from an IME.
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: ' ｊｕｎ＠ｅｘａｍｐｌｅ．ｃｏｍ ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await waitFor(() => expect(mockGo).toHaveBeenCalledWith('jun@example.com'));
});

it('explains an invalid email next to the field', () => {
  render(<EmailInput onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jun@' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
    'Please enter a valid email',
  );
  expect(mockGo).not.toHaveBeenCalled();
});

it('never asks to share the email at sign-in, even when the app requires it', () => {
  // The email is asked for after sign-in, with the rest of the request.
  setForceEmail(true);
  render(<EmailInput onSubmit={onSubmit} />);

  expect(screen.queryByRole('switch')).toBeNull();
  for (const name of ['Continue', 'Continue with Google', 'Continue with Apple']) {
    expect(screen.getByRole('button', { name })).not.toHaveAttribute('aria-disabled');
  }
});

it('welcomes back an account used here before, keeping its email answer', async () => {
  localStorage.setItem(`logged_email_${mockClientId}`, 'jun@example.com');
  localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
  render(<EmailInput onSubmit={onSubmit} />);

  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue as jun@example.com' }));
  await waitFor(() => expect(mockGo).toHaveBeenCalledWith('jun@example.com'));
  // Signing in doesn't touch the answer given before.
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Use another account' }));
  expect(screen.getByLabelText('Email')).toHaveValue('');
});

it.each([
  ['a new account', () => {}],
  [
    'a returning account',
    () => localStorage.setItem(`logged_email_${mockClientId}`, 'jun@example.com'),
  ],
])('Cancel goes back to the app signed out, for %s', (_, setup) => {
  setup();
  render(<EmailInput onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(mockSendError).toHaveBeenCalledWith(
    'User cancelled sign-in',
    'https://acme.example/callback',
    undefined,
    mockUi.setUiState,
  );
  expect(mockGo).not.toHaveBeenCalled();
});

it('passes the Google token on as proof of the email', async () => {
  const token = jwtWith({ email: 'a@b.co', email_verified: true });
  await exchangeSucceedsWith(token);
  expect(mockGo).toHaveBeenCalledWith('a@b.co', token);
});

it('refuses a provider token whose email is not verified', async () => {
  await exchangeSucceedsWith(jwtWith({ email: 'a@b.co', email_verified: false }));
  expect(mockGo).not.toHaveBeenCalled();
  expect(mockUi.setError).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'signin.error.no_email' }),
  );
});
