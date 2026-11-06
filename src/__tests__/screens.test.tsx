/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React, { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('../utils/chunkReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/chunkReload')>()),
  reloadPage: vi.fn(),
}));
// The Logout screen's chunk can't be fetched.
vi.mock('../components/Auth/Logout', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});

import { captureException } from '@sentry/react';
import { reloadPage } from '../utils/chunkReload';
import { ScreenErrorBoundary } from '../components/Shell/ScreenErrorBoundary';
import { UiStates } from '../enums';
import { Logout, preloadScreens } from '../screens';

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('reloads when a screen’s chunk is missing', async () => {
  render(
    <ScreenErrorBoundary>
      <Suspense fallback={null}>
        <Logout />
      </Suspense>
    </ScreenErrorBoundary>,
  );

  await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
  expect(captureException).not.toHaveBeenCalled();
});

it('ignores a preload that fails', async () => {
  // A rejection left unhandled here would fail the run.
  preloadScreens([UiStates.LOGOUT, UiStates.EMAIL_INPUT]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(reloadPage).not.toHaveBeenCalled();
});
