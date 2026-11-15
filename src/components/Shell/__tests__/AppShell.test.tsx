/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { render, screen } from '@testing-library/react';

const mockState = vi.hoisted(() => ({ uiState: 'VEHICLE_MANAGER', jwt: 'jwt' }));
vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    jwt: mockState.jwt,
    user: { email: 'alice@x.co' },
    switchAccount: () => {},
  }),
}));
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({
    uiState: mockState.uiState,
    prevUiStates: [],
    goBack: () => {},
    busy: false,
  }),
}));
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ oemBrand: null }),
}));

import { AppShell } from '../AppShell';

beforeEach(() => {
  mockState.uiState = 'VEHICLE_MANAGER';
  mockState.jwt = 'jwt';
});

it('shows the account bar outside the scrolling content', () => {
  render(
    <AppShell>
      <p>screen</p>
    </AppShell>,
  );

  const bar = screen.getByText('Signed in as alice@x.co');
  expect(bar.closest('main')).toBeNull();
  expect(screen.getByRole('main')).toContainElement(screen.getByText('screen'));
});

it('shows no account bar while loading', () => {
  render(
    <AppShell loading>
      <p>screen</p>
    </AppShell>,
  );
  expect(screen.queryByText(/Signed in as/)).toBeNull();
});

it('shows no account bar without a session', () => {
  mockState.jwt = '';
  render(
    <AppShell>
      <p>screen</p>
    </AppShell>,
  );
  expect(screen.queryByText(/Signed in as/)).toBeNull();
});
