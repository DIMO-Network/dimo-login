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
const mockResume = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ resumeAccount: mockResume }),
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

import { CHOOSER_ARM_MS, EmailInput } from '../EmailInput';
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
  // Testing Library's waitFor only drives Jest's fake timers, so these also
  // advance with real time.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  localStorage.clear();
  setForceEmail(false);
  mockGo.mockResolvedValue(undefined);
  mockOAuthUrl = 'https://accounts.example/oauth';
});
afterEach(() => vi.useRealTimers());

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

  await waitFor(() => expect(mockGo).toHaveBeenCalledWith('jun@example.com', undefined));
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

const seed = (...emails: string[]) =>
  localStorage.setItem(
    'dimo_accounts',
    JSON.stringify(
      emails.map((email, i) => ({
        email,
        subOrganizationId: `sub-${i}`,
        lastUsedAt: 9 - i,
      })),
    ),
  );

/** The chooser, once it takes clicks (it ignores them for CHOOSER_ARM_MS). */
const renderChooser = () => {
  render(<EmailInput onSubmit={onSubmit} />);
  act(() => {
    vi.advanceTimersByTime(CHOOSER_ARM_MS);
  });
};

it('offers every account used on this device', () => {
  seed('alice@x.co', 'bob@x.co');
  render(<EmailInput onSubmit={onSubmit} />);
  expect(screen.getByRole('heading', { name: 'Choose an account' })).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Continue as alice@x.co' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Continue as bob@x.co' }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Email')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
});

it('offers the account known only from the legacy record, keeping its email answer', async () => {
  localStorage.setItem(`logged_email_${mockClientId}`, 'jun@example.com');
  localStorage.setItem(`email_granted_${mockClientId}_jun@example.com`, 'true');
  mockResume.mockResolvedValue(false);
  renderChooser();

  fireEvent.click(screen.getByRole('button', { name: 'Continue as jun@example.com' }));
  await waitFor(() => expect(mockGo).toHaveBeenCalledWith('jun@example.com', undefined));
  // Signing in doesn't touch the answer given before.
  expect(getEmailChoice(mockClientId, 'jun@example.com')).toBe(true);
});

it('signs a chosen account in silently when its session is live', async () => {
  seed('alice@x.co');
  mockResume.mockResolvedValue(true);
  renderChooser();
  fireEvent.click(screen.getByRole('button', { name: 'Continue as alice@x.co' }));
  await waitFor(() =>
    expect(mockResume).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@x.co' }),
    ),
  );
  expect(mockGo).not.toHaveBeenCalled();
});

it('remembers the chosen account’s email for the screens after, even when it resumes', async () => {
  // A resumed account whose key expires later lands on the code screen, which
  // must not name an email typed before.
  seed('alice@x.co');
  mockResume.mockResolvedValue(true);
  renderChooser();
  fireEvent.click(screen.getByRole('button', { name: 'Continue as alice@x.co' }));
  await waitFor(() => expect(mockResume).toHaveBeenCalled());
  expect(onSubmit).toHaveBeenCalledWith('alice@x.co');
});

it('goes to the passkey or sign-up step when it can’t resume', async () => {
  seed('alice@x.co');
  mockResume.mockResolvedValue(false);
  renderChooser();
  fireEvent.click(screen.getByRole('button', { name: 'Continue as alice@x.co' }));
  await waitFor(() => expect(mockGo).toHaveBeenCalledWith('alice@x.co', undefined));
  expect(onSubmit).toHaveBeenCalledWith('alice@x.co');
});

it('doesn’t sign anyone in until an account is clicked', () => {
  seed('alice@x.co');
  render(<EmailInput onSubmit={onSubmit} />);
  expect(mockResume).not.toHaveBeenCalled();
  expect(mockGo).not.toHaveBeenCalled();
});

it('shows an error when resuming throws', async () => {
  seed('alice@x.co');
  mockResume.mockRejectedValue(new Error('boom'));
  renderChooser();
  fireEvent.click(screen.getByRole('button', { name: 'Continue as alice@x.co' }));
  await waitFor(() =>
    expect(mockUi.setError).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'signin.error.details' }),
    ),
  );
  expect(mockGo).not.toHaveBeenCalled();
});

it('“Use another account” shows the email field and forgets nothing', () => {
  seed('alice@x.co');
  render(<EmailInput onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Use another account' }));
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Continue with Google' }),
  ).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('dimo_accounts')!)).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Back to accounts' }));
  expect(
    screen.getByRole('button', { name: 'Continue as alice@x.co' }),
  ).toBeInTheDocument();
});

it('removes an account from this device', () => {
  seed('alice@x.co');
  renderChooser();
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove alice@x.co from this device' }),
  );
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(localStorage.getItem('dimo_accounts')).toBe('[]');
});

it('names the remove button with hidden text, keeping the email out of click breadcrumbs', () => {
  // Sentry's click breadcrumbs record aria-label, not the text inside.
  seed('alice@x.co');
  render(<EmailInput onSubmit={onSubmit} />);
  const remove = screen.getByRole('button', {
    name: 'Remove alice@x.co from this device',
  });
  expect(remove).not.toHaveAttribute('aria-label');
});

it('ignores clicks on the accounts for a moment after the chooser appears', async () => {
  // A popup opened under a rapid click must not take that click as a choice.
  seed('alice@x.co', 'bob@x.co');
  mockResume.mockResolvedValue(true);
  render(<EmailInput onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue as alice@x.co' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove bob@x.co from this device' }),
  );
  expect(mockResume).not.toHaveBeenCalled();
  expect(onSubmit).not.toHaveBeenCalled();
  expect(
    screen.getByRole('button', { name: 'Continue as bob@x.co' }),
  ).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(CHOOSER_ARM_MS);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue as alice@x.co' }));
  await waitFor(() =>
    expect(mockResume).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@x.co' }),
    ),
  );
});

it('falls back to the email field when the stored accounts are unreadable', () => {
  localStorage.setItem('dimo_accounts', '{not json');
  render(<EmailInput onSubmit={onSubmit} />);
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
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

it.each([
  ['says it is not', { email: 'a@b.co', email_verified: false }],
  ['doesn’t say it is', { email: 'a@b.co' }],
])('refuses a provider token whose email %s verified', async (_, payload) => {
  await exchangeSucceedsWith(jwtWith(payload));
  expect(mockGo).not.toHaveBeenCalled();
  expect(mockUi.setError).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'signin.error.email_unverified' }),
  );
});

it('asks for another way to sign in when the provider shared no email', async () => {
  await exchangeSucceedsWith(jwtWith({ email_verified: true }));
  expect(mockGo).not.toHaveBeenCalled();
  expect(mockUi.setError).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'signin.error.no_email' }),
  );
});
