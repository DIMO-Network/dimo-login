/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, render, screen } from '@testing-library/react';

import type { UiStates } from '../enums';

const mockApp = vi.hoisted(() => {
  const gate = () => {
    let open!: () => void;
    const opened = new Promise<void>((resolve) => {
      open = resolve;
    });
    return { opened, open };
  };
  return {
    uiState: 'SUCCESS' as UiStates,
    entryState: 'EMAIL_INPUT' as string,
    isLoading: false,
    waitingForParams: false,
    waitingForDevLicense: false,
    language: 'en' as string | undefined,
    idleCallbacks: [] as (() => void)[],
    preloadScreens: vi.fn(),
    loadSignInSteps: vi.fn(),
    loadNextScreen: () => {},
    // The Japanese copy loads, and the Spanish fails, when the test says so.
    japanese: gate(),
    spanish: gate(),
  };
});
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
    loadingState: { isLoading: mockApp.isLoading, message: 'Getting things ready…' },
    waitingForParams: mockApp.waitingForParams,
    waitingForDevLicense: mockApp.waitingForDevLicense,
    invalidCredentials: false,
    language: mockApp.language,
  }),
}));
vi.mock('../context/AuthContext', () => ({
  useAuthContext: () => ({
    setJwt: () => {},
    setUser: () => {},
    jwt: 'jwt',
    user: { email: 'alice@x.co' },
    switchAccount: () => {},
  }),
}));
vi.mock('../hooks/useErrorHandler', () => ({ useErrorHandler: () => ({ error: null }) }));
vi.mock('../services/sessionService', () => ({ initializeSession: () => {} }));
vi.mock('../services/walletLoader', () => ({
  loadSignInSteps: () => mockApp.loadSignInSteps(),
}));
vi.mock('../i18n/locales/ja', async (importOriginal) => {
  await mockApp.japanese.opened;
  return importOriginal();
});
vi.mock('../i18n/locales/es', async () => {
  await mockApp.spanish.opened;
  throw new TypeError('Failed to fetch dynamically imported module');
});
vi.mock('../components/Auth/EmailInput', async () => {
  const { createElement } = await import('react');
  const { useT } = await import('../i18n');
  const EmailInput = () => createElement('h1', null, useT()('signin.title_default'));
  return { EmailInput };
});
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
import { i18n } from '../i18n/instance';
import { SIGN_IN_STATES } from '../screens';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockApp.uiState = 'SUCCESS' as UiStates;
  mockApp.entryState = 'EMAIL_INPUT';
  mockApp.isLoading = false;
  mockApp.waitingForParams = false;
  mockApp.waitingForDevLicense = false;
  mockApp.language = 'en';
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

// As a popup sees it: the SDK's message names the language, then the license
// check finishes while that language's copy is still loading.
const openWithLanguage = (language: string) => {
  mockApp.uiState = 'EMAIL_INPUT' as UiStates;
  mockApp.isLoading = true;
  mockApp.waitingForParams = true;
  mockApp.language = undefined;
  const { rerender } = render(<App />);

  mockApp.waitingForParams = false;
  mockApp.language = language;
  rerender(<App />);
  mockApp.isLoading = false;
  rerender(<App />);
};

it('shows no text before the app’s settings say which language to use', () => {
  mockApp.isLoading = true;
  mockApp.waitingForParams = true;
  render(<App />);

  expect(screen.getByRole('status')).toHaveTextContent(/^$/);
  expect(screen.queryByRole('button', { name: /English/ })).not.toBeInTheDocument();
});

it('shows no text in the old language while the app’s language loads', () => {
  // Before the next test opens the Japanese gate.
  openWithLanguage('ja');

  expect(screen.getByRole('status')).toHaveTextContent(/^$/);
  expect(screen.queryByRole('button', { name: /English/ })).not.toBeInTheDocument();
});

it('keeps the loading screen until the language the app asked for has loaded', async () => {
  openWithLanguage('ja');

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();

  await act(async () => mockApp.japanese.open());

  expect(
    await screen.findByRole('heading', { name: 'DIMOでサインイン' }),
  ).toBeInTheDocument();
});

it('shows the screen in the current language when the app’s language fails to load', async () => {
  openWithLanguage('es');
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();

  await act(async () => mockApp.spanish.open());

  expect(
    await screen.findByRole('heading', { name: 'Sign in with DIMO' }),
  ).toBeInTheDocument();
  expect(console.error).toHaveBeenCalledWith(
    'Could not load the "es" translations',
    expect.anything(),
  );
});
