/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SignUpDraft } from '../../../hooks/useSignUpFlow';

const confirmRelay = vi.fn();
vi.mock('../../../hooks/useSignUp', () => ({
  useSignUp: () => ({ confirmRelay }),
}));
let mockDraft: SignUpDraft | null = null;
const openEmailForm = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({ signUpDraft: mockDraft, openEmailForm }),
}));
const mockUi = { setUiState: vi.fn() };
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => mockUi,
}));

import { UiStates } from '../../../enums';
import { RelayEmailNotice } from '../RelayEmailNotice';

const RELAY = 'x7k2@privaterelay.appleid.com';
const RELAY_DRAFT: SignUpDraft = { kind: 'proof', email: RELAY, proofToken: 'tok' };

const renderScreen = (draft: SignUpDraft | null) => {
  mockDraft = draft;
  return render(<RelayEmailNotice />);
};

beforeEach(() => vi.clearAllMocks());

it('names the relay address and says a new account is separate', () => {
  renderScreen(RELAY_DRAFT);
  expect(
    screen.getByRole('heading', { name: 'Apple is hiding your email' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      new RegExp(`You’re signing in with ${RELAY}, an address Apple made`),
    ),
  ).toBeInTheDocument();
  expect(screen.getByText(/stop using Sign in with Apple for DIMO/)).toBeInTheDocument();
});

it('Create a new account goes on with the sign-up', () => {
  renderScreen(RELAY_DRAFT);
  fireEvent.click(screen.getByRole('button', { name: 'Create a new account' }));
  expect(confirmRelay).toHaveBeenCalledTimes(1);
  expect(openEmailForm).not.toHaveBeenCalled();
});

it('Use my email instead opens the email form', () => {
  renderScreen(RELAY_DRAFT);
  fireEvent.click(screen.getByRole('button', { name: 'Use my email instead' }));
  expect(openEmailForm).toHaveBeenCalledTimes(1);
  expect(confirmRelay).not.toHaveBeenCalled();
});

it('without a sign-up in progress, goes to the email screen', () => {
  // An app can name this state as its entryState; there is nothing to confirm then.
  const { container } = renderScreen(null);
  expect(container).toBeEmptyDOMElement();
  expect(mockUi.setUiState).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
});

it('goes to the email screen for a sign-up that is not a relay one', () => {
  renderScreen({ kind: 'proof', email: 'jun@icloud.com', proofToken: 'tok' });
  expect(mockUi.setUiState).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
  expect(screen.queryByRole('button', { name: 'Create a new account' })).toBeNull();
});
