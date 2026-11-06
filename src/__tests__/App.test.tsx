/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, render, screen } from '@testing-library/react';

import type { UiStates } from '../enums';

let mockUiState = 'SUCCESS' as UiStates;
vi.mock('../context/UIManagerContext', () => ({
  useUIManager: () => ({
    uiState: mockUiState,
    setUiState: () => {},
    entryState: 'EMAIL_INPUT',
    prevUiStates: [],
    goBack: () => {},
    busy: false,
  }),
}));
vi.mock('../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({
    clientId: '0x2222222222222222222222222222222222222222',
    devLicenseAlias: 'Acme',
    oemBrand: null,
    loadingState: { isLoading: false, message: '' },
    waitingForDevLicense: false,
    invalidCredentials: false,
  }),
}));
vi.mock('../context/AuthContext', () => ({
  useAuthContext: () => ({ setJwt: () => {}, setUser: () => {} }),
}));
vi.mock('../hooks/useErrorHandler', () => ({ useErrorHandler: () => ({ error: null }) }));
vi.mock('../services/sessionService', () => ({ initializeSession: () => {} }));
vi.mock('../i18n/useLanguageSync', () => ({ useLanguageSync: () => {} }));
vi.mock('../utils/onIdle', () => ({ onIdle: () => () => {} }));
vi.mock('@sentry/react', () => ({ captureException: () => {} }));

// The first screen (SUCCESS) is already loaded; the next one (OTP_INPUT) loads
// when the test says so.
const mockNextScreen = vi.hoisted(() => ({ load: () => {} }));
vi.mock('../screens', async (importOriginal) => {
  const { createElement, lazy } = await import('react');
  const withHeading = (title: string) => () =>
    createElement('h1', { 'data-screen-heading': true, 'tabIndex': -1 }, title);
  return {
    ...(await importOriginal<typeof import('../screens')>()),
    SuccessPage: lazy(() => Promise.resolve({ default: withHeading('All done') })),
    ManageVehicle: () => {
      throw new Error('render failed');
    },
    OtpInput: lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          mockNextScreen.load = () => resolve({ default: withHeading('Enter the code') });
        }),
    ),
  };
});

import App from '../App';

it('leaves focus alone on the first screen and moves it to the next screen’s heading', async () => {
  mockUiState = 'SUCCESS' as UiStates;
  const { rerender } = render(<App />);

  await screen.findByRole('heading', { name: 'All done' });
  expect(document.activeElement).toBe(document.body);

  mockUiState = 'OTP_INPUT' as UiStates;
  rerender(<App />);
  // The next screen's chunk is still loading.
  expect(screen.getByRole('status')).toBeInTheDocument();

  await act(async () => mockNextScreen.load());

  const heading = await screen.findByRole('heading', { name: 'Enter the code' });
  expect(document.activeElement).toBe(heading);
});

it('shows the next screen after one that failed', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockUiState = 'MANAGE_VEHICLE' as UiStates;
  const { rerender } = render(<App />);
  expect(
    screen.getByRole('heading', { name: 'This screen didn’t load' }),
  ).toBeInTheDocument();

  // Back, or any other step, gets a fresh boundary.
  mockUiState = 'SUCCESS' as UiStates;
  rerender(<App />);

  expect(await screen.findByRole('heading', { name: 'All done' })).toBeInTheDocument();
});
