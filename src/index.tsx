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
import { sentryOptions } from './sentryOptions';

// Initialize Sentry
Sentry.init(sentryOptions);

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
