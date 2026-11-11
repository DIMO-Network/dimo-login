/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const finish = vi.fn();
vi.mock('../../../hooks/useSignUp', () => ({
  useSignUp: () => ({ finish }),
}));
let mockDraft: {
  email: string;
  otpId?: string;
  otpCode?: string;
  proofToken?: string;
} | null = null;
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ signUpDraft: mockDraft }),
}));
const mockUi = {
  error: null,
  setError: vi.fn(),
  setBusy: vi.fn(),
};
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => mockUi,
}));

import { message } from '../../../i18n';
import { PasskeyGeneration } from '../PasskeyGeneration';

const renderScreen = (draft: typeof mockDraft) => {
  mockDraft = draft;
  return render(<PasskeyGeneration />);
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUi.error = null;
});

it('shows the email the account is for', () => {
  renderScreen({ email: 'a@b.co', otpId: 'otp-1', otpCode: '123456' });
  expect(screen.getByText('a@b.co')).toBeInTheDocument();
});

it('renders nothing without a sign-up in progress', () => {
  const { container } = renderScreen(null);
  expect(container).toBeEmptyDOMElement();
});

it('finishes sign-up when the passkey button is pressed', async () => {
  finish.mockResolvedValue('done');
  renderScreen({ email: 'a@b.co', otpId: 'otp-1', otpCode: '123456' });
  fireEvent.click(screen.getByRole('button', { name: 'Create passkey' }));
  await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
  expect(mockUi.setError).toHaveBeenLastCalledWith(null);
});

it('explains a rejected code', async () => {
  finish.mockResolvedValue('code_rejected');
  renderScreen({ email: 'a@b.co', otpId: 'otp-1', otpCode: '000000' });
  fireEvent.click(screen.getByRole('button', { name: 'Create passkey' }));
  await waitFor(() =>
    expect(mockUi.setError).toHaveBeenLastCalledWith(message('signup.error.code')),
  );
});

it('says the account could not be created when anything else fails', async () => {
  finish.mockRejectedValue(new Error('network'));
  renderScreen({ email: 'a@b.co', proofToken: 'tok' });
  fireEvent.click(screen.getByRole('button', { name: 'Create passkey' }));
  await waitFor(() =>
    expect(mockUi.setError).toHaveBeenLastCalledWith(message('create.error')),
  );
});
