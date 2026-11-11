/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const submitCode = vi.fn();
const resend = vi.fn();
vi.mock('../../../hooks/useSignUp', () => ({
  useSignUp: () => ({ submitCode, resend }),
}));
let mockDraft: { email: string; otpId?: string } | null = null;
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

const renderScreen = (draft: { email: string; otpId?: string } | null) => {
  mockDraft = draft;
  return render(<SignUpCode />);
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  mockUi.error = null;
  resend.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

it('names the email the code went to', () => {
  renderScreen({ email: 'a@b.co', otpId: 'otp-1' });
  expect(screen.getByText(/We sent a 6-digit code to a@b.co/)).toBeInTheDocument();
});

it('hands a complete code to sign-up', () => {
  renderScreen({ email: 'a@b.co', otpId: 'otp-1' });
  const continueButton = screen.getByRole('button', { name: 'Continue' });
  expect(continueButton).toHaveAttribute('aria-disabled', 'true');
  fireEvent.paste(boxes()[0], { clipboardData: { getData: () => '481234' } });
  fireEvent.click(continueButton);
  expect(submitCode).toHaveBeenCalledWith('481234');
});

it('holds "Send a new code" for 30 seconds after each send', async () => {
  renderScreen({ email: 'a@b.co', otpId: 'otp-1' });
  const resendButton = screen.getByRole('button', { name: 'Send a new code' });
  expect(resendButton).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(resendButton);
  expect(resend).not.toHaveBeenCalled();
  await act(async () => {
    vi.advanceTimersByTime(30_000);
  });
  expect(resendButton).not.toHaveAttribute('aria-disabled');
  fireEvent.click(resendButton);
  fireEvent.click(resendButton);
  expect(resend).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('A new code is on its way.')).toBeInTheDocument();
});

it('shows a failed resend and lets the user try again at once', async () => {
  resend.mockRejectedValue(new Error('boom'));
  renderScreen({ email: 'a@b.co', otpId: 'otp-1' });
  await act(async () => {
    vi.advanceTimersByTime(30_000);
  });
  const resendButton = screen.getByRole('button', { name: 'Send a new code' });
  fireEvent.click(resendButton);
  expect(await screen.findByText('Couldn’t send a code. Try again.')).toBeInTheDocument();
  expect(resendButton).not.toHaveAttribute('aria-disabled');
});

it('shows why it came back from the passkey step', () => {
  mockUi.error = message('signup.error.code');
  renderScreen({ email: 'a@b.co', otpId: 'otp-1' });
  expect(
    screen.getByText('That code didn’t work. Check it or send a new one.'),
  ).toBeInTheDocument();
  boxes().forEach((box) => expect(box).toHaveAttribute('aria-invalid', 'true'));
});

it('renders nothing without a sign-up in progress', () => {
  const { container } = renderScreen(null);
  expect(container).toBeEmptyDOMElement();
});
