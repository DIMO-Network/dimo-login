/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { email: 'jun@example.com' },
    // The prompt stays open for these tests.
    completePasskeyLogin: () => new Promise(() => {}),
    resetUser: vi.fn(),
  }),
}));
vi.mock('../../../context/UIManagerContext', () => ({
  useUIManager: () => ({ setError: vi.fn(), setUiState: vi.fn(), error: null }),
}));
vi.mock('../../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({}),
}));

import { PasskeyLogin } from '../PasskeyLogin';
import { PasskeyLoginFail } from '../PasskeyLoginFail';

// Typed bob@x.co, then chose jun's account: the passkey asked for is jun's.
it.each([
  ['the passkey prompt', () => <PasskeyLogin email="bob@x.co" />],
  ['the passkey retry screen', () => <PasskeyLoginFail email="bob@x.co" />],
])('%s names the signed-in account, not an email typed earlier', (_, screenFor) => {
  render(screenFor());
  expect(screen.getByText(/Use the passkey for jun@example.com/)).toBeInTheDocument();
});
