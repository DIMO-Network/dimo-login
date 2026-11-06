/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { captureException } from '@sentry/react';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';

it('says the screen didn’t load when a lazy screen fails', async () => {
  // React logs the error it caught; the test only cares what the person sees.
  vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <ScreenErrorBoundary>
      <Suspense fallback={null}>
        {React.createElement(React.lazy(() => Promise.reject(new Error('chunk'))))}
      </Suspense>
    </ScreenErrorBoundary>,
  );

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
