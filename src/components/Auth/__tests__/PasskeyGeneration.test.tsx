/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SignUpDraft } from '../../../hooks/useSignUpFlow';

const finish = vi.fn();
vi.mock('../../../hooks/useSignUp', () => ({
  useSignUp: () => ({ finish }),
}));
let mockDraft: SignUpDraft | null = null;
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

const KEY = { publicKeyUncompressed: 'PUB', privateKey: 'PRIV' };
const CODE_DRAFT: SignUpDraft = {
  kind: 'code',
  email: 'a@b.co',
  otpId: 'otp-1',
  key: KEY,
  otpCode: '123456',
};

const renderScreen = (draft: SignUpDraft | null) => {
  mockDraft = draft;
  return render(<PasskeyGeneration />);
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUi.error = null;
});

it('shows the email the account is for', () => {
  renderScreen(CODE_DRAFT);
  expect(screen.getByText('a@b.co')).toBeInTheDocument();
});

it('renders nothing without a sign-up in progress', () => {
  const { container } = renderScreen(null);
  expect(container).toBeEmptyDOMElement();
});

it('finishes sign-up when the passkey button is pressed', async () => {
  // Sign-up moves on by itself, a rejected code included: the screen adds nothing.
  finish.mockResolvedValue(undefined);
  renderScreen(CODE_DRAFT);
  fireEvent.click(screen.getByRole('button', { name: 'Create passkey' }));
  await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(mockUi.setBusy).toHaveBeenLastCalledWith(false));
  expect(mockUi.setError).toHaveBeenCalledTimes(1);
  expect(mockUi.setError).toHaveBeenCalledWith(null);
});

it('says the account could not be created when anything else fails', async () => {
  finish.mockRejectedValue(new Error('network'));
  renderScreen({ kind: 'proof', email: 'a@b.co', proofToken: 'tok' });
  fireEvent.click(screen.getByRole('button', { name: 'Create passkey' }));
  await waitFor(() =>
    expect(mockUi.setError).toHaveBeenLastCalledWith(message('create.error')),
  );
});
