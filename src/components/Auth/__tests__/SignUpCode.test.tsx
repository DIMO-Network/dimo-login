/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { SignUpDraft } from '../../../hooks/useSignUpFlow';

const submitCode = vi.fn();
const resend = vi.fn();
vi.mock('../../../hooks/useSignUp', () => ({
  useSignUp: () => ({ submitCode, resend }),
}));
let mockDraft: SignUpDraft | null = null;
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ signUpDraft: mockDraft }),
}));
const mockUi: { error: unknown; setError: ReturnType<typeof vi.fn> } = {
  error: null,
  setError: vi.fn(),
};
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => mockUi,
}));

import { message } from '../../../i18n';
import { SignUpCode } from '../SignUpCode';

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const continueButton = () => screen.getByRole('button', { name: 'Continue' });
const resendButton = () => screen.getByRole('button', { name: 'Send a new code' });
const typeCode = (code: string) =>
  fireEvent.paste(boxes()[0], { clipboardData: { getData: () => code } });

/** A code draft whose latest code went out `ago` ms before now. */
const sentAgo = (ago: number): SignUpDraft => ({
  kind: 'code',
  email: 'a@b.co',
  otpId: 'otp-1',
  key: { publicKeyUncompressed: 'PUB', privateKey: 'PRIV' },
  sentAt: Date.now() - ago,
});

const renderScreen = (draft: SignUpDraft | null) => {
  mockDraft = draft;
  return render(<SignUpCode />);
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  mockUi.error = null;
  // As the real resend does: the draft records when the new code went out.
  resend.mockImplementation(async () => {
    mockDraft = sentAgo(0);
  });
});
afterEach(() => vi.useRealTimers());

it('names the email the code went to', () => {
  renderScreen(sentAgo(0));
  expect(screen.getByText(/We sent a 6-digit code to a@b.co/)).toBeInTheDocument();
});

it('hands a complete code to sign-up', () => {
  renderScreen(sentAgo(0));
  expect(continueButton()).toHaveAttribute('aria-disabled', 'true');
  typeCode('481234');
  fireEvent.click(continueButton());
  expect(submitCode).toHaveBeenCalledWith('481234');
});

it('holds "Send a new code" for 30 seconds after each send', async () => {
  renderScreen(sentAgo(0));
  expect(resendButton()).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(resendButton());
  expect(resend).not.toHaveBeenCalled();
  await act(async () => {
    vi.advanceTimersByTime(30_000);
  });
  expect(resendButton()).not.toHaveAttribute('aria-disabled');
  fireEvent.click(resendButton());
  fireEvent.click(resendButton());
  expect(resend).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('A new code is on its way.')).toBeInTheDocument();
  expect(resendButton()).toHaveAttribute('aria-disabled', 'true');
});

it('counts the wait from the last send, not from when the screen opened', async () => {
  // Back from the passkey step, 20 s after the code went out.
  renderScreen(sentAgo(20_000));
  expect(resendButton()).toHaveAttribute('aria-disabled', 'true');
  await act(async () => {
    vi.advanceTimersByTime(10_000);
  });
  expect(resendButton()).not.toHaveAttribute('aria-disabled');
});

it('offers a new code at once when the last one went out long ago', () => {
  renderScreen(sentAgo(60_000));
  expect(resendButton()).not.toHaveAttribute('aria-disabled');
});

it('shows a failed resend and lets the user try again at once', async () => {
  resend.mockRejectedValue(new Error('boom'));
  renderScreen(sentAgo(60_000));
  fireEvent.click(resendButton());
  expect(await screen.findByText('Couldn’t send a code. Try again.')).toBeInTheDocument();
  expect(resendButton()).not.toHaveAttribute('aria-disabled');
});

it('holds Continue while a new code is on its way', async () => {
  const sending = deferred();
  resend.mockReturnValue(sending.promise);
  renderScreen(sentAgo(60_000));
  typeCode('481234');
  fireEvent.click(resendButton());
  expect(continueButton()).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(continueButton());
  fireEvent.keyDown(boxes()[5], { key: 'Enter' });
  expect(submitCode).not.toHaveBeenCalled();
  await act(async () => {
    sending.reject(new Error('boom'));
  });
  // Nothing new went out, so the typed code still counts.
  expect(continueButton()).not.toHaveAttribute('aria-disabled');
});

it('clears the typed code once a new one is sent', async () => {
  renderScreen(sentAgo(0));
  await act(async () => {
    vi.advanceTimersByTime(30_000);
  });
  typeCode('481234');
  fireEvent.click(resendButton());
  expect(await screen.findByText('A new code is on its way.')).toBeInTheDocument();
  boxes().forEach((box) => expect(box).toHaveValue(''));
});

it('shows why it came back from the passkey step', () => {
  mockUi.error = message('signup.error.code');
  renderScreen(sentAgo(0));
  expect(
    screen.getByText('That code didn’t work. Check it or send a new one.'),
  ).toBeInTheDocument();
  boxes().forEach((box) => expect(box).toHaveAttribute('aria-invalid', 'true'));
});

it('marks the boxes invalid only for a rejected code', () => {
  mockUi.error = message('create.error');
  renderScreen(sentAgo(0));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  boxes().forEach((box) => expect(box).not.toHaveAttribute('aria-invalid'));
});

it('renders nothing without a sign-up in progress', () => {
  const { container } = renderScreen(null);
  expect(container).toBeEmptyDOMElement();
});
