import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import { initialLanguage, startInitialLanguage } from './i18n';
import { AuthProvider } from './context/AuthContext';
import { DevCredentialsProvider } from './context/DevCredentialsContext';
import { UIManagerProvider } from './context/UIManagerContext';
import { GlobalOraclesProvider } from './context/OraclesContext';

// Initialize Sentry
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  // User data, including the IP address on events, is collected by default
  // (`dataCollection.userInfo`), as `sendDefaultPii: true` did before Sentry 11.
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
});

// The detected language (Spanish or Japanese) loads beside the first render,
// not before it, so READY goes out at once; App shows a loading screen with no
// text until it's in, for at most LANGUAGE_WAIT_MS.
startInitialLanguage(initialLanguage());

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary>
      <UIManagerProvider>
        <GlobalOraclesProvider>
          <DevCredentialsProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </DevCredentialsProvider>
        </GlobalOraclesProvider>
      </UIManagerProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
