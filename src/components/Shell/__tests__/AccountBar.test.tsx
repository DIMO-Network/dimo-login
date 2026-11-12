/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { UiStates } from '../../../enums';

const mockState = vi.hoisted(() => ({
  uiState: 'VEHICLE_MANAGER',
  busy: false,
  jwt: 'jwt',
  email: 'alice@x.co' as string | undefined,
  switchAccount: vi.fn(),
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    jwt: mockState.jwt,
    user: { email: mockState.email },
    switchAccount: mockState.switchAccount,
  }),
}));
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ uiState: mockState.uiState, busy: mockState.busy }),
}));

import { ACCOUNT_BAR_STATES, AccountBar } from '../AccountBar';

const renderBar = (
  overrides: Partial<{
    uiState: UiStates;
    busy: boolean;
    jwt: string;
    email: string;
  }> = {},
) => {
  Object.assign(mockState, {
    uiState: UiStates.VEHICLE_MANAGER,
    busy: false,
    jwt: 'jwt',
    email: 'alice@x.co',
    ...overrides,
  });
  return render(<AccountBar />);
};

beforeEach(() => {
  mockState.switchAccount = vi.fn();
});

it('is part of the connected apps page', () => {
  expect(ACCOUNT_BAR_STATES.has(UiStates.CONNECTED_APPS)).toBe(true);
});

it.each([...ACCOUNT_BAR_STATES])('names the account on %s', (state) => {
  renderBar({ uiState: state });
  expect(screen.getByText('Signed in as alice@x.co')).toBeInTheDocument();
});

it.each([
  UiStates.EMAIL_INPUT,
  UiStates.PASSKEY_LOGIN,
  UiStates.OTP_INPUT,
  UiStates.TRANSACTION_SUCCESS,
])('stays out of %s', (state) => {
  renderBar({ uiState: state });
  expect(screen.queryByText(/Signed in as/)).toBeNull();
});

it('shows nothing before sign-in', () => {
  renderBar({ uiState: UiStates.VEHICLE_MANAGER, jwt: '' });
  expect(screen.queryByText(/Signed in as/)).toBeNull();
});

it('shows nothing without an email', () => {
  renderBar({ email: '' });
  expect(screen.queryByText(/Signed in as/)).toBeNull();
});

it('switches account', () => {
  renderBar({ uiState: UiStates.SIGN_MESSAGE });
  fireEvent.click(screen.getByRole('button', { name: 'Use another account' }));
  expect(mockState.switchAccount).toHaveBeenCalledTimes(1);
});

it('offers no switch while something is being signed', () => {
  renderBar({ uiState: UiStates.SIGN_MESSAGE, busy: true });
  expect(screen.getByText('Signed in as alice@x.co')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Use another account' })).toBeNull();
});

it('names the new account once the user changes', () => {
  const { rerender } = renderBar();
  expect(screen.getByText('Signed in as alice@x.co')).toBeInTheDocument();

  mockState.email = 'bob@x.co';
  rerender(<AccountBar />);

  expect(screen.getByText('Signed in as bob@x.co')).toBeInTheDocument();
  expect(screen.queryByText(/alice@x.co/)).toBeNull();
});
