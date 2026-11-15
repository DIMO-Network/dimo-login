import type { BrowserOptions } from '@sentry/react';

/** What index.tsx starts Sentry with. */
export const sentryOptions: BrowserOptions = {
  dsn: process.env.REACT_APP_SENTRY_DSN,
  // User data, including the IP address on events, is collected by default
  // (`dataCollection.userInfo`), as `sendDefaultPii: true` did before Sentry 11.
  dataCollection: {
    // An app's loginHint is an email. Every URL Sentry records (the page's on
    // an event, a navigation breadcrumb's from and to, a request's) carries
    // `loginHint=[Filtered]` instead, including the first page's URL and the
    // breadcrumb of the login taking it out of the address bar.
    urlQueryParams: { deny: ['loginHint'] },
  },
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
};
