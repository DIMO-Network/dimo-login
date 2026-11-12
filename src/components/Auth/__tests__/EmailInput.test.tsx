/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockClientId = '0x2222222222222222222222222222222222222222';
const mockGo = vi.fn();
let mockOAuthUrl: string | null = 'https://accounts.example/oauth';
let mockExchanging = false;
let mockOnExchangeSuccess: ((token: string) => unknown) | undefined;
vi.mock('../../../hooks/useOAuthCodeExchange', () => ({
  useOAuthCodeExchange: (options: { onSuccess: (token: string) => unknown }) => {
    mockOnExchangeSuccess = options.onSuccess;
    return { isExchanging: mockExchanging };
  },
}));
vi.mock('../../../hooks/useConstructOAuthUrl', () => ({
  useConstructOAuthUrl: () => () => mockOAuthUrl,
}));
vi.mock('../../../hooks/useGoToLoginOrSignUp', () => ({
  useGoToLoginOrSignUp: () => mockGo,
}));
// The app's raw parameters; the screen goes by AuthContext's accountRequest.
const mockCreds: { loginHint?: string } = {};
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: mockClientId,
    devLicenseAlias: 'Acme',
    redirectUri: 'https://acme.example/callback',
    ...mockCreds,
  }),
}));
const mockResume = vi.fn();
// What the app asked for, as AuthContext holds it until someone signs in here.
const mockRequest: { prompt?: string; loginHint?: string } = {};
// "Use my email instead" (the relay notice) asks for the email form once.
const mockEmailForm = { intent: false, clear: vi.fn() };
const mockSetUser = vi.fn();
const mockSetPasskeyHint = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    resumeAccount: mockResume,
    accountRequest: mockRequest,
    emailFormIntent: mockEmailForm.intent,
    clearEmailFormIntent: mockEmailForm.clear,
    setUser: mockSetUser,
    setPasskeyHint: mockSetPasskeyHint,
  }),
}));
let mockEmbedded = false;
vi.mock('../../../utils/isEmbed', () => ({ isEmbed: () => mockEmbedded }));
vi.mock('../../../services/passkeyLookup', () => ({
  fetchPasskeyChallenge: vi.fn(),
  getPasskeyAssertion: vi.fn(),
  findAccountByPasskey: vi.fn(),
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
import {
  fetchPasskeyChallenge,
  findAccountByPasskey,
  getPasskeyAssertion,
} from '../../../services/passkeyLookup';
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
  delete mockCreds.loginHint;
  delete mockRequest.prompt;
  delete mockRequest.loginHint;
  mockExchanging = false;
  mockEmailForm.intent = false;
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

it('opens on the email form, once, when asked to (Use my email instead)', () => {
  seed('alice@x.co');
  mockEmailForm.intent = true;
  render(<EmailInput onSubmit={onSubmit} />);
  expect(screen.getByLabelText('Email')).toHaveValue('');
  expect(screen.queryByRole('button', { name: 'Continue as alice@x.co' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Back to accounts' })).toBeInTheDocument();
  expect(mockEmailForm.clear).toHaveBeenCalled();
});

it('opens on the chooser when nothing asked for the form', () => {
  seed('alice@x.co');
  render(<EmailInput onSubmit={onSubmit} />);
  expect(
    screen.getByRole('button', { name: 'Continue as alice@x.co' }),
  ).toBeInTheDocument();
  expect(mockEmailForm.clear).not.toHaveBeenCalled();
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

it('pre-fills an email the app hinted at', () => {
  mockRequest.loginHint = 'new@x.co';
  render(<EmailInput onSubmit={onSubmit} />);
  expect(screen.getByLabelText('Email')).toHaveValue('new@x.co');
  expect(mockGo).not.toHaveBeenCalled();
});

it('offers a way back to the accounts from a hinted email nobody remembers', () => {
  seed('alice@x.co');
  mockRequest.loginHint = 'new@x.co';
  render(<EmailInput onSubmit={onSubmit} />);
  expect(screen.getByLabelText('Email')).toHaveValue('new@x.co');
  fireEvent.click(screen.getByRole('button', { name: 'Back to accounts' }));
  expect(
    screen.getByRole('button', { name: 'Continue as alice@x.co' }),
  ).toBeInTheDocument();
});

it('narrows the chooser to a hinted account it remembers', () => {
  seed('alice@x.co', 'bob@x.co');
  mockRequest.loginHint = 'bob@x.co';
  render(<EmailInput onSubmit={onSubmit} />);
  expect(
    screen.getByRole('button', { name: 'Continue as bob@x.co' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Continue as alice@x.co' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Use another account' })).toBeInTheDocument();
});

it('never signs in by itself on a hint', () => {
  seed('bob@x.co');
  mockRequest.loginHint = 'bob@x.co';
  render(<EmailInput onSubmit={onSubmit} />);
  expect(
    screen.getByRole('button', { name: 'Continue as bob@x.co' }),
  ).toBeInTheDocument();
  expect(mockResume).not.toHaveBeenCalled();
  expect(mockGo).not.toHaveBeenCalled();
});

it('shows an empty email field for "Use another account" when the hint matched', () => {
  seed('alice@x.co', 'bob@x.co');
  mockRequest.loginHint = 'bob@x.co';
  render(<EmailInput onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Use another account' }));
  expect(screen.getByLabelText('Email')).toHaveValue('');
});

it('with a prompt, finishes a provider return instead of showing the sign-in screen again', async () => {
  seed('alice@x.co');
  mockRequest.prompt = 'login';
  mockExchanging = true;
  const { rerender } = render(<EmailInput onSubmit={onSubmit} />);
  expect(screen.queryByRole('button', { name: 'Continue as alice@x.co' })).toBeNull();
  expect(screen.queryByLabelText('Email')).toBeNull();

  await act(async () => {
    await mockOnExchangeSuccess!(
      jwtWith({ email: 'jun@example.com', email_verified: true }),
    );
  });
  expect(mockGo).toHaveBeenCalledWith('jun@example.com', expect.any(String));

  mockExchanging = false;
  rerender(<EmailInput onSubmit={onSubmit} />);
  expect(mockResume).not.toHaveBeenCalled();
});

it('offers every account, and an empty field, once the app’s request is spent', () => {
  // Someone signed in on this page, then chose "Use another account": the
  // app's hint was about the first sign-in.
  seed('alice@x.co', 'bob@x.co');
  mockCreds.loginHint = 'bob@x.co';
  render(<EmailInput onSubmit={onSubmit} />);
  expect(
    screen.getByRole('button', { name: 'Continue as alice@x.co' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Continue as bob@x.co' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Use another account' }));
  expect(screen.getByLabelText('Email')).toHaveValue('');
});

describe('Sign in with a passkey', () => {
  const FLAG = 'REACT_APP_PASSKEY_FIRST';
  // Made per test: the clock is fake, and its time differs from test to test.
  let challenge: { challenge: string; expiresAt: string };
  const ASSERTION = {
    id: 'cred-1',
    response: { clientDataJSON: 'cd', authenticatorData: 'ad', signature: 'sig' },
  };
  const ACCOUNT = {
    email: 'jun@example.com',
    subOrganizationId: 'sub-jun',
    hasPasskey: true,
    emailVerified: true,
    smartContractAddress: null,
    walletAddress: null,
  };
  const passkeyButton = () =>
    screen.queryByRole('button', { name: 'Sign in with a passkey' });
  /** The email form, once its challenge (and the module that signs it) has come in. */
  const renderReady = async () => {
    const view = render(<EmailInput onSubmit={onSubmit} />);
    await waitFor(() => expect(fetchPasskeyChallenge).toHaveBeenCalled());
    await act(async () => {});
    return view;
  };

  beforeEach(() => {
    process.env[FLAG] = 'true';
    Object.defineProperty(window, 'PublicKeyCredential', {
      configurable: true,
      value: function PublicKeyCredential() {},
    });
    challenge = {
      challenge: 'AQID',
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    };
    vi.mocked(fetchPasskeyChallenge).mockImplementation(async () => challenge);
    vi.mocked(getPasskeyAssertion).mockResolvedValue(ASSERTION);
    vi.mocked(findAccountByPasskey).mockResolvedValue(ACCOUNT);
  });
  afterEach(() => {
    delete process.env[FLAG];
    Reflect.deleteProperty(window, 'PublicKeyCredential');
    mockEmbedded = false;
  });

  it.each([undefined, 'false', 'TRUE'])('is hidden with the flag %s', (flag) => {
    if (flag === undefined) delete process.env[FLAG];
    else process.env[FLAG] = flag;
    render(<EmailInput onSubmit={onSubmit} />);
    expect(passkeyButton()).toBeNull();
    expect(fetchPasskeyChallenge).not.toHaveBeenCalled();
  });

  it('is hidden in a browser without WebAuthn', () => {
    Reflect.deleteProperty(window, 'PublicKeyCredential');
    render(<EmailInput onSubmit={onSubmit} />);
    expect(passkeyButton()).toBeNull();
  });

  it('is hidden embedded', () => {
    mockEmbedded = true;
    render(<EmailInput onSubmit={onSubmit} />);
    expect(passkeyButton()).toBeNull();
    expect(fetchPasskeyChallenge).not.toHaveBeenCalled();
  });

  it('shows on the email form, after Apple, and fetches a challenge for it', async () => {
    render(<EmailInput onSubmit={onSubmit} />);
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons.indexOf('Sign in with a passkey')).toBe(
      buttons.indexOf('Continue with Apple') + 1,
    );
    await waitFor(() => expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(1));
  });

  it('is not on the chooser', () => {
    seed('alice@x.co');
    render(<EmailInput onSubmit={onSubmit} />);
    expect(passkeyButton()).toBeNull();
    expect(fetchPasskeyChallenge).not.toHaveBeenCalled();
  });

  it('signs in as the account the passkey proves, pinned to that passkey', async () => {
    await renderReady();
    fireEvent.click(passkeyButton()!);

    await waitFor(() => expect(mockUi.setUiState).toHaveBeenCalledWith('PASSKEY_LOGIN'));
    expect(getPasskeyAssertion).toHaveBeenCalledWith('AQID');
    expect(findAccountByPasskey).toHaveBeenCalledWith('AQID', ASSERTION);
    expect(mockSetUser).toHaveBeenCalledWith(ACCOUNT);
    expect(mockSetPasskeyHint).toHaveBeenCalledWith({
      credentialId: 'cred-1',
      subOrganizationId: 'sub-jun',
    });
    expect(onSubmit).toHaveBeenCalledWith('jun@example.com');
    expect(mockGo).not.toHaveBeenCalled();
  });

  it('opens the prompt inside the click when a challenge is ready', async () => {
    await renderReady();
    fireEvent.click(passkeyButton()!);
    // Nothing awaited first: Safari opens the prompt only while the click is handled.
    expect(getPasskeyAssertion).toHaveBeenCalledWith('AQID');
    expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(1);
  });

  it('keeps a challenge ready, fetching the next before the last runs out', async () => {
    // Asked for again 90 s after the last was asked for.
    const { unmount } = await renderReady();
    await act(() => vi.advanceTimersByTimeAsync(85_000));
    expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    await waitFor(() => expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(2));
    await act(() => vi.advanceTimersByTimeAsync(90_000));
    await waitFor(() => expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(3));

    unmount();
    await act(() => vi.advanceTimersByTimeAsync(300_000));
    expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(3);
  });

  it('judges a challenge’s age by when this page asked for it', async () => {
    // The server's clock says it has already run out; it was asked for just now.
    challenge = { challenge: 'AQID', expiresAt: '2000-01-01T00:00:00Z' };
    await renderReady();
    fireEvent.click(passkeyButton()!);
    expect(getPasskeyAssertion).toHaveBeenCalledWith('AQID');
  });

  it('fetches a new challenge on the click when the ready one is too old', async () => {
    await renderReady();
    // The refresh never comes back, and the challenge from the start gets old.
    vi.mocked(fetchPasskeyChallenge).mockReturnValueOnce(new Promise(() => {}));
    await act(() => vi.advanceTimersByTimeAsync(106_000));
    challenge = { ...challenge, challenge: 'BAUG' };
    fireEvent.click(passkeyButton()!);
    expect(getPasskeyAssertion).not.toHaveBeenCalled();
    await waitFor(() => expect(getPasskeyAssertion).toHaveBeenCalledWith('BAUG'));
  });

  it('says so when the passkey has no account it can find, and leaves the form', async () => {
    vi.mocked(findAccountByPasskey).mockResolvedValue(null);
    await renderReady();
    fireEvent.click(passkeyButton()!);
    await waitFor(() =>
      expect(mockUi.setError).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'signin.error.passkey_unknown' }),
      ),
    );
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockSetPasskeyHint).not.toHaveBeenCalled();
    expect(mockUi.setUiState).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it.each(['NotAllowedError', 'AbortError'])(
    'says nothing when the prompt ends with %s, and leaves the form usable',
    async (name) => {
      vi.mocked(getPasskeyAssertion).mockRejectedValue(new DOMException('closed', name));
      await renderReady();
      fireEvent.click(passkeyButton()!);
      await waitFor(() => expect(mockUi.setLoadingState).toHaveBeenLastCalledWith(false));
      expect(mockUi.setError).not.toHaveBeenCalledWith(
        expect.objectContaining({ key: expect.any(String) }),
      );
      expect(findAccountByPasskey).not.toHaveBeenCalled();
      expect(mockSetPasskeyHint).not.toHaveBeenCalled();
      expect(passkeyButton()).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'jun@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() =>
        expect(mockGo).toHaveBeenCalledWith('jun@example.com', undefined),
      );
    },
  );

  it('says the passkey couldn’t be used when a prompt that waited for the network is refused', async () => {
    // No challenge in advance: the prompt opens after a fetch, which Safari may refuse.
    vi.mocked(fetchPasskeyChallenge).mockRejectedValueOnce(new Error('offline'));
    vi.mocked(getPasskeyAssertion).mockRejectedValue(
      new DOMException('refused', 'NotAllowedError'),
    );
    await renderReady();
    fireEvent.click(passkeyButton()!);
    await waitFor(() =>
      expect(mockUi.setError).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'signin.error.passkey' }),
      ),
    );
  });

  it('says the passkey couldn’t be used when anything else fails', async () => {
    vi.mocked(findAccountByPasskey).mockRejectedValue(new Error('Challenge expired'));
    await renderReady();
    fireEvent.click(passkeyButton()!);
    await waitFor(() =>
      expect(mockUi.setError).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'signin.error.passkey' }),
      ),
    );
    expect(mockUi.setUiState).not.toHaveBeenCalled();
  });

  it('fetches a challenge on the click when none came in advance', async () => {
    vi.mocked(fetchPasskeyChallenge).mockRejectedValueOnce(new Error('offline'));
    await renderReady();
    fireEvent.click(passkeyButton()!);
    await waitFor(() => expect(getPasskeyAssertion).toHaveBeenCalledWith('AQID'));
    expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(2);
  });

  it('never uses a challenge twice', async () => {
    vi.mocked(getPasskeyAssertion).mockRejectedValue(
      new DOMException('closed', 'NotAllowedError'),
    );
    await renderReady();
    fireEvent.click(passkeyButton()!);
    await waitFor(() => expect(getPasskeyAssertion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(2));
  });

  it('starts one attempt on a double click', async () => {
    vi.mocked(getPasskeyAssertion).mockReturnValue(new Promise(() => {}));
    await renderReady();
    fireEvent.click(passkeyButton()!);
    fireEvent.click(passkeyButton()!);
    expect(getPasskeyAssertion).toHaveBeenCalledTimes(1);
  });
});
