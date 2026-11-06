/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React, { Suspense } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('../utils/chunkReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/chunkReload')>()),
  reloadPage: vi.fn(),
}));
// The Logout screen's chunk can't be fetched.
vi.mock('../components/Auth/Logout', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});
vi.mock('../components/Auth/OtpInput', async () => {
  const { createElement } = await import('react');
  return { OtpInput: () => createElement('h1', null, 'Enter the code') };
});

import { captureException } from '@sentry/react';
import { reloadPage } from '../utils/chunkReload';
import { LoadingScreen } from '../components/Shared/LoadingScreen';
import { ScreenErrorBoundary } from '../components/Shell/ScreenErrorBoundary';
import { UiStates } from '../enums';
import { lazyScreen, Logout, OtpInput, preloadScreens } from '../screens';

// As App renders a screen: a boundary and a Suspense keyed by the step.
const Step = ({ step, children }: { step: string; children: React.ReactNode }) => (
  <ScreenErrorBoundary key={step} firstScreen={{ current: null }}>
    <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
  </ScreenErrorBoundary>
);

const loadingScreensAdded = (records: MutationRecord[]) =>
  records
    .flatMap((record) => [...record.addedNodes])
    .filter(
      (node) =>
        node instanceof Element &&
        (node.matches('[role="status"]') || node.querySelector('[role="status"]')),
    );

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('reloads when a screen’s chunk is missing', async () => {
  render(
    <Step step="logout">
      <Logout />
    </Step>,
  );

  await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
  expect(captureException).not.toHaveBeenCalled();
});

it('ignores a preload that fails', async () => {
  // A rejection left unhandled here would fail the run.
  await preloadScreens([UiStates.LOGOUT, UiStates.EMAIL_INPUT]);
  expect(reloadPage).not.toHaveBeenCalled();
});

it('shows a preloaded screen without the loading screen', async () => {
  await preloadScreens([UiStates.OTP_INPUT]);
  const { container, rerender } = render(
    <Step step="email">
      <h1>Your email</h1>
    </Step>,
  );
  const observer = new MutationObserver(() => {});
  observer.observe(container, { childList: true, subtree: true });

  rerender(
    <Step step="code">
      <OtpInput email="jun@example.com" />
    </Step>,
  );

  // Rendered in the same commit, not after a fallback.
  expect(screen.getByRole('heading', { name: 'Enter the code' })).toBeInTheDocument();
  await act(async () => {});
  expect(loadingScreensAdded(observer.takeRecords())).toEqual([]);
  observer.disconnect();
});

it('loads a screen whose preload failed', async () => {
  // A network blip on the preload; the chunk loads when the screen is shown.
  const load = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
    .mockResolvedValueOnce({ default: () => <h1>Try again</h1> });
  const Retry = lazyScreen(load);
  await expect(Retry.preload()).rejects.toThrow('Failed to fetch');

  render(
    <Step step="retry">
      <Retry />
    </Step>,
  );

  expect(await screen.findByRole('heading', { name: 'Try again' })).toBeInTheDocument();
  expect(load).toHaveBeenCalledTimes(2);
  expect(reloadPage).not.toHaveBeenCalled();
});

it('loads a screen once when it is shown while its preload is in flight', async () => {
  let finish = (_module: { default: React.ComponentType }) => {};
  const load = vi.fn(
    () =>
      new Promise<{ default: React.ComponentType }>((resolve) => {
        finish = resolve;
      }),
  );
  const Slow = lazyScreen(load);
  const preloaded = Slow.preload();

  render(
    <Step step="slow">
      <Slow />
    </Step>,
  );
  expect(screen.getByRole('status')).toBeInTheDocument();
  await act(async () => {
    finish({ default: () => <h1>Loaded</h1> });
    await preloaded;
  });

  expect(await screen.findByRole('heading', { name: 'Loaded' })).toBeInTheDocument();
  expect(load).toHaveBeenCalledTimes(1);
});
