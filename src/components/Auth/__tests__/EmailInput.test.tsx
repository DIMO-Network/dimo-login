/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockClientId = '0x2222222222222222222222222222222222222222';
jest.mock('../../../services', () =>
  jest.requireActual('../../../services/storageService'),
);
const mockGo = jest.fn();
jest.mock('../../../hooks', () => ({
  useOAuthCodeExchange: () => ({ isExchanging: false }),
  useConstructOAuthUrl: () => () => 'https://accounts.example/oauth',
  useGoToLoginOrSignUp: () => mockGo,
}));
jest.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
  }),
}));
const mockUi = {
  error: null,
  setError: jest.fn(),
  altTitle: false,
  setLoadingState: jest.fn(),
};
jest.mock('../../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
jest.mock('../../Shared', () => ({
  ErrorMessage: () => null,
  Loader: () => null,
  UIManagerLoaderWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock('@sentry/react', () => ({ captureException: jest.fn() }));

import { EmailInput } from '../EmailInput';
import { setForceEmail } from '../../../stores/AuthStateStore';
import { isEmailGranted } from '../../../services/storageService';

const onSubmit = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  setForceEmail(false);
  mockGo.mockResolvedValue(undefined);
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
  fireEvent.click(screen.getByRole('switch', { name: /Share my email with Acme/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await waitFor(() => expect(mockGo).toHaveBeenCalledWith('jun@example.com'));
  expect(isEmailGranted(mockClientId, 'jun@example.com')).toBe(true);
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

it('holds every way in until the email is shared when the app requires it', () => {
  setForceEmail(true);
  render(<EmailInput onSubmit={onSubmit} />);
  const hint = 'Acme needs your email. Turn on email sharing to continue.';

  for (const name of ['Continue', 'Continue with Google', 'Continue with Apple']) {
    const button = screen.getByRole('button', { name });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(hint);
  }
  expect(screen.getByText('Required')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('switch', { name: /Share my email with Acme/ }));
  expect(screen.getByRole('button', { name: 'Continue' })).not.toHaveAttribute(
    'aria-disabled',
  );
  expect(screen.queryByText(hint)).toBeNull();
});

it('welcomes back an account used here before, with its last choice', async () => {
  localStorage.setItem(`logged_email_${mockClientId}`, 'jun@example.com');
  localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
  render(<EmailInput onSubmit={onSubmit} />);

  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Continue as jun@example.com' }));
  await waitFor(() => expect(mockGo).toHaveBeenCalledWith('jun@example.com'));

  fireEvent.click(screen.getByRole('button', { name: 'Use another account' }));
  expect(screen.getByLabelText('Email')).toHaveValue('');
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
});
