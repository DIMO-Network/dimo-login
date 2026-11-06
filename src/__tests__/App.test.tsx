/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, render, screen } from '@testing-library/react';

import type { UiStates } from '../enums';

const mockApp = vi.hoisted(() => ({
  uiState: 'SUCCESS' as UiStates,
  entryState: 'EMAIL_INPUT' as string,
  waitingForDevLicense: false,
  idleCallbacks: [] as (() => void)[],
  preloadScreens: vi.fn(),
  loadSignInSteps: vi.fn(),
  loadNextScreen: () => {},
}));
vi.mock('../context/UIManagerContext', () => ({
  useUIManager: () => ({
    uiState: mockApp.uiState,
    setUiState: () => {},
    entryState: mockApp.entryState,
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
    waitingForDevLicense: mockApp.waitingForDevLicense,
    invalidCredentials: false,
  }),
}));
vi.mock('../context/AuthContext', () => ({
  useAuthContext: () => ({ setJwt: () => {}, setUser: () => {} }),
}));
vi.mock('../hooks/useErrorHandler', () => ({ useErrorHandler: () => ({ error: null }) }));
vi.mock('../services/sessionService', () => ({ initializeSession: () => {} }));
vi.mock('../services/walletLoader', () => ({
  loadSignInSteps: () => mockApp.loadSignInSteps(),
}));
vi.mock('../i18n/useLanguageSync', () => ({ useLanguageSync: () => {} }));
vi.mock('../utils/onIdle', () => ({
  onIdle: (callback: () => void) => {
    mockApp.idleCallbacks.push(callback);
    return () => {};
  },
}));
vi.mock('@sentry/react', () => ({ captureException: () => {} }));

// The first screen (SUCCESS) is already loaded; the next one (OTP_INPUT) loads
// when the test says so; MANAGE_VEHICLE breaks.
vi.mock('../screens', async (importOriginal) => {
  const { createElement, lazy } = await import('react');
  const withHeading = (title: string) => () =>
    createElement('h1', { 'data-screen-heading': true, 'tabIndex': -1 }, title);
  return {
    ...(await importOriginal<typeof import('../screens')>()),
    preloadScreens: (...args: unknown[]) => mockApp.preloadScreens(...args),
    SuccessPage: lazy(() => Promise.resolve({ default: withHeading('All done') })),
    ManageVehicle: () => {
      throw new Error('render failed');
    },
    OtpInput: lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          mockApp.loadNextScreen = () =>
            resolve({ default: withHeading('Enter the code') });
        }),
    ),
  };
});

import App from '../App';
import { SIGN_IN_STATES } from '../screens';

beforeEach(() => {
  mockApp.uiState = 'SUCCESS' as UiStates;
  mockApp.entryState = 'EMAIL_INPUT';
  mockApp.waitingForDevLicense = false;
  mockApp.idleCallbacks = [];
  mockApp.loadSignInSteps.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('leaves focus alone on the first screen and moves it to the next screen’s heading', async () => {
  const { rerender } = render(<App />);

  await screen.findByRole('heading', { name: 'All done' });
  expect(document.activeElement).toBe(document.body);

  mockApp.uiState = 'OTP_INPUT' as UiStates;
  rerender(<App />);
  // The next screen's chunk is still loading.
  expect(screen.getByRole('status')).toBeInTheDocument();

  await act(async () => mockApp.loadNextScreen());

  const heading = await screen.findByRole('heading', { name: 'Enter the code' });
  expect(document.activeElement).toBe(heading);
});

it('moves focus to the error’s heading when the next screen fails', async () => {
  const { rerender } = render(<App />);
  await screen.findByRole('heading', { name: 'All done' });

  mockApp.uiState = 'MANAGE_VEHICLE' as UiStates;
  rerender(<App />);

  const heading = await screen.findByRole('heading', { name: 'This screen didn’t load' });
  expect(document.activeElement).toBe(heading);
});

it('shows the next screen after one that failed', async () => {
  mockApp.uiState = 'MANAGE_VEHICLE' as UiStates;
  const { rerender } = render(<App />);
  expect(
    screen.getByRole('heading', { name: 'This screen didn’t load' }),
  ).toBeInTheDocument();
  // It's the first screen: focus stays where the page put it.
  expect(document.activeElement).toBe(document.body);

  // Back, or any other step, gets a fresh boundary.
  mockApp.uiState = 'SUCCESS' as UiStates;
  rerender(<App />);

  expect(await screen.findByRole('heading', { name: 'All done' })).toBeInTheDocument();
});

it('preloads the sign-in screens, the app’s entry screen and the wallet once credentials check out', async () => {
  mockApp.entryState = 'VEHICLE_MANAGER';
  mockApp.waitingForDevLicense = true;
  const { rerender } = render(<App />);
  await screen.findByRole('heading', { name: 'All done' });
  expect(mockApp.idleCallbacks).toHaveLength(0);

  mockApp.waitingForDevLicense = false;
  rerender(<App />);
  expect(mockApp.idleCallbacks).toHaveLength(1);
  expect(mockApp.preloadScreens).not.toHaveBeenCalled();

  act(() => mockApp.idleCallbacks[0]());

  expect(mockApp.preloadScreens).toHaveBeenCalledWith([
    ...SIGN_IN_STATES,
    'VEHICLE_MANAGER',
  ]);
  expect(mockApp.loadSignInSteps).toHaveBeenCalledTimes(1);
});
