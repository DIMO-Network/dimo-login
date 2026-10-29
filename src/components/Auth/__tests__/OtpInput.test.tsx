/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSendOtp = vi.fn();
vi.mock('../../../services', () => ({
  sendOtp: (...args: unknown[]) => mockSendOtp(...args),
}));
const mockComplete = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { email: 'jun@example.com' },
    completeOTPLogin: mockComplete,
  }),
}));
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setError: vi.fn() }),
}));

import { OtpInput, toDigits } from '../OtpInput';

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockSendOtp.mockResolvedValue({ success: true, data: { otpId: 'otp-1' } });
});
afterEach(() => vi.useRealTimers());

const renderSent = async (email = '') => {
  render(<OtpInput email={email} />);
  // The first code is sent after a short debounce.
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
  expect(mockSendOtp).toHaveBeenCalledWith('jun@example.com');
};

it('turns full-width digits from a Japanese keyboard into the code', () => {
  expect(toDigits('４８１２３４')).toBe('481234');
  expect(toDigits('12-34 56')).toBe('123456');
});

it('names the account even when the sign-in step was skipped', async () => {
  await renderSent();
  expect(
    screen.getByText(/We sent a 6-digit code to jun@example.com/),
  ).toBeInTheDocument();
});

it('asks for the numeric keypad and offers one-time-code autofill', async () => {
  await renderSent();
  expect(boxes()).toHaveLength(6);
  boxes().forEach((box) => expect(box).toHaveAttribute('inputmode', 'numeric'));
  expect(boxes()[0]).toHaveAttribute('autocomplete', 'one-time-code');
});

it('fills every box from a pasted code and verifies it', async () => {
  mockComplete.mockResolvedValue(undefined);
  await renderSent();
  const verify = screen.getByRole('button', { name: 'Verify' });
  expect(verify).toHaveAttribute('aria-disabled', 'true');

  fireEvent.paste(boxes()[0], { clipboardData: { getData: () => '４８１ ２３４' } });
  expect(
    boxes()
      .map((b) => b.value)
      .join(''),
  ).toBe('481234');

  fireEvent.click(verify);
  await waitFor(() =>
    expect(mockComplete).toHaveBeenCalledWith({ otpId: 'otp-1', otpCode: '481234' }),
  );
});

it('says the code did not work, with the reason underneath', async () => {
  mockComplete.mockRejectedValue(new Error('OTP expired'));
  await renderSent();
  fireEvent.change(boxes()[0], { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('That code didn’t work');
  expect(alert).toHaveTextContent('Details: OTP expired');
  boxes().forEach((box) => expect(box).toHaveAttribute('aria-invalid', 'true'));
});

it('leaves the boxes valid when the code could not be sent', async () => {
  mockSendOtp.mockResolvedValue({ success: false, error: 'User not found' });
  await renderSent();

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Details: User not found');
  boxes().forEach((box) => expect(box).not.toHaveAttribute('aria-invalid'));
});
