/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('../../../utils/chunkReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/chunkReload')>()),
  reloadPage: vi.fn(),
}));

import { captureException } from '@sentry/react';
import { ChunkLoadError, reloadPage } from '../../../utils/chunkReload';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';

const missingChunk = () =>
  new ChunkLoadError(new TypeError('Failed to fetch dynamically imported module'));

const LazyScreenThatFails = ({ error }: { error: Error }) => (
  <ScreenErrorBoundary firstScreen={{ current: null }}>
    <Suspense fallback={null}>
      {React.createElement(React.lazy(() => Promise.reject(error)))}
    </Suspense>
  </ScreenErrorBoundary>
);

const Broken = (): React.ReactElement => {
  throw new Error('render failed');
};

beforeEach(() => {
  sessionStorage.clear();
  // React logs the error it caught; the tests only care what the person sees.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('says the screen didn’t load when a lazy screen fails', async () => {
  render(<LazyScreenThatFails error={new Error('chunk')} />);

  expect(
    await screen.findByRole('heading', { name: 'This screen didn’t load' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Check your connection and start again from the app.'),
  ).toBeInTheDocument();
  expect(captureException).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'chunk' }),
  );
});

it('reloads once for a missing chunk instead of showing an error', async () => {
  render(<LazyScreenThatFails error={missingChunk()} />);

  // The loading screen stays up while the page reloads.
  expect(await screen.findByRole('status')).toBeInTheDocument();
  expect(reloadPage).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  expect(captureException).not.toHaveBeenCalled();
});

it('says the screen didn’t load when its chunk is still missing after the reload', async () => {
  sessionStorage.setItem('dimo:chunk-reload-at', String(Date.now()));
  const error = missingChunk();

  render(<LazyScreenThatFails error={error} />);

  expect(
    await screen.findByRole('heading', { name: 'This screen didn’t load' }),
  ).toBeInTheDocument();
  expect(reloadPage).not.toHaveBeenCalled();
  expect(captureException).toHaveBeenCalledWith(error);
});

it('says the screen didn’t load, without reloading, when a screen breaks', () => {
  render(
    <ScreenErrorBoundary firstScreen={{ current: null }}>
      <Broken />
    </ScreenErrorBoundary>,
  );

  expect(
    screen.getByRole('heading', { name: 'This screen didn’t load' }),
  ).toBeInTheDocument();
  expect(reloadPage).not.toHaveBeenCalled();
  expect(captureException).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'render failed' }),
  );
});
