import * as Sentry from '@sentry/react';
import type { BrowserOptions, Event } from '@sentry/react';

import { sentryOptions } from '../sentryOptions';
import { removeQueryParam } from '../utils/urlHelpers';

/** What Sentry hands its transport to send. */
type Envelope = Parameters<
  ReturnType<NonNullable<BrowserOptions['transport']>>['send']
>[0];

// The email, however it's encoded.
const HINTED_EMAIL = /jun(@|%40|%2540)example\.com/i;

/** Sentry as index.tsx starts it, sending to a transport the test reads. */
const startSentry = () => {
  const envelopes: Envelope[] = [];
  Sentry.init({
    ...sentryOptions,
    dsn: 'https://public@o0.ingest.sentry.io/0',
    transport: () => ({
      send: (envelope) => {
        envelopes.push(envelope);
        return Promise.resolve({});
      },
      flush: () => Promise.resolve(true),
    }),
  });
  return envelopes;
};

const eventsIn = (envelopes: Envelope[]): Event[] =>
  envelopes.flatMap(([, items]) =>
    items
      .filter(([header]) => header.type === 'event')
      .map(([, payload]) => payload as Event),
  );

afterEach(() => Sentry.close());

it('sends no loginHint in the URLs it records: the page’s, and a navigation’s from and to', async () => {
  // A redirect-mode page, as it loads.
  window.history.replaceState(
    null,
    '',
    '/?clientId=0xc&loginHint=jun%40example.com&altTitle=true',
  );
  const envelopes = startSentry();

  // An error before the login has read the hint, then one after it took the
  // hint out of the address bar (a navigation breadcrumb from the first URL).
  Sentry.captureException(new Error('before'));
  removeQueryParam('loginHint');
  Sentry.captureException(new Error('after'));
  await Sentry.flush(1000);

  const [before, after] = eventsIn(envelopes);
  // The URLs are collected, so the email's absence means something.
  expect(before.request?.url).toContain('clientId=0xc');
  const navigation = after.breadcrumbs?.find(({ category }) => category === 'navigation');
  expect(navigation?.data?.from).toContain('clientId=0xc');
  expect(navigation?.data?.to).toContain('clientId=0xc');

  expect(JSON.stringify(envelopes)).not.toMatch(HINTED_EMAIL);
});
