/**
 * DevCredentialsContext.tsx
 *
 * This file provides the DevCredentialsContext and DevCredentialsProvider, which manage global
 * state for developer credentials (clientId, apiKey, redirectUri) in the application. These credentials
 * are typically provided by the developer when using the SDK
 *
 */

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  ReactElement,
} from 'react';

import { createKernelSigner } from '../services/turnkeyService';
import { CredentialParams } from '../types';
import { isStandalone } from '../utils/isStandalone';
import { isValidClientId } from '../services/identityService';
import { setEmailGranted } from '../services/storageService';
import { setForceEmail } from '../stores/AuthStateStore';
import { UiStates, useUIManager } from './UIManagerContext';

interface DevCredentialsContextProps {
  apiKey: string;
  clientId: string;
  devLicenseAlias: string;
  invalidCredentials: boolean;
  redirectUri: string;
  utm: string;
}

const DevCredentialsContext = createContext<DevCredentialsContextProps | undefined>(
  undefined,
);

// Provider component for Dev Credentials
export const DevCredentialsProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const [clientId, setClientId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [redirectUri, setRedirectUri] = useState<string>('');
  const [utm, setUtm] = useState<string>('');
  const [invalidCredentials, setInvalidCredentials] = useState<boolean>(false);
  const [devLicenseAlias, setDevLicenseAlias] = useState<string>('');
  const { setUiState, setEntryState, setLoadingState, setAltTitle } = useUIManager();

  // Config setters map
  const configSetters = {
    apiKey: setApiKey,
    redirectUri: setRedirectUri,
    utm: setUtm,
    clientId: setClientId,
    entryState: (value: UiStates) => {
      setUiState(value);
      setEntryState(value);
    },
    forceEmail: (value: boolean) => setForceEmail(value === true),
    altTitle: (value: boolean) => setAltTitle(value === true),
  };

  // Helper function to apply configuration entries
  const applyConfig = (config: Record<string, unknown>) => {
    Object.entries(config).forEach(([key, value]) => {
      if (
        key in configSetters &&
        configSetters[key as keyof typeof configSetters] &&
        value !== undefined
      ) {
        configSetters[key as keyof typeof configSetters](value as never);
      }
    });
  };

  // Helper function to process state from URL
  const processStateFromUrl = (stateFromUrl: string | null) => {
    if (!stateFromUrl) return;

    const state = JSON.parse(stateFromUrl);
    setEmailGranted(state.clientId, state.emailPermissionGranted || false);

    if (isStandalone()) {
      applyConfig({
        clientId: state.clientId,
        apiKey: 'api key',
        redirectUri: state.redirectUri,
        utm: state.utm,
        entryState: state.entryState || UiStates.EMAIL_INPUT,
        altTitle: state.altTitle,
      });
    }
  };

  // Helper function to process URL parameters
  const processUrlParams = (urlParams: URLSearchParams) => {
    const clientIdFromUrl = urlParams.get('clientId');
    const redirectUriFromUrl = urlParams.get('redirectUri');

    if (!clientIdFromUrl || !redirectUriFromUrl) return false;

    applyConfig({
      clientId: clientIdFromUrl,
      apiKey: 'api key',
      redirectUri: redirectUriFromUrl,
      entryState: urlParams.get('entryState') as UiStates,
      forceEmail: urlParams.get('forceEmail') === 'true',
      utm: urlParams.get('utm'),
      altTitle: urlParams.get('altTitle') === 'true',
    });

    return true;
  };

  // Helper function to handle message events
  const handleMessage = (event: MessageEvent, stateFromUrl: string | null) => {
    const { eventType, clientId, apiKey, redirectUri, entryState, forceEmail, altTitle } =
      event.data;

    if (eventType === 'AUTH_INIT') {
      console.log('Received AUTH_INIT message', event);
      const finalEntryState = stateFromUrl
        ? JSON.parse(stateFromUrl).entryState
        : entryState || UiStates.EMAIL_INPUT;

      applyConfig({
        clientId,
        apiKey,
        redirectUri,
        entryState: finalEntryState,
        forceEmail,
        altTitle,
      });
    }
  };

  // useEffect for handling initialization
  useEffect(() => {
    setLoadingState(true, 'Waiting for credentials...');
    const urlParams = new URLSearchParams(window.location.search);
    const stateFromUrl = urlParams.get('state');

    if (stateFromUrl) {
      processStateFromUrl(stateFromUrl);
    } else if (!processUrlParams(urlParams)) {
      const messageHandler = (event: MessageEvent) => handleMessage(event, stateFromUrl);
      window.addEventListener('message', messageHandler);
      return () => {
        window.removeEventListener('message', messageHandler);
      };
    }
  }, []);

  // useEffect for validating credentials
  useEffect(() => {
    const validateCredentials = async () => {
      if (clientId && redirectUri) {
        const { isValid, alias } = await isValidClientId(clientId, redirectUri);
        if (isValid) {
          setDevLicenseAlias(alias); // Set the alias in global state
          createKernelSigner(clientId, clientId, redirectUri);
          setLoadingState(false); // Credentials loaded
        } else {
          setInvalidCredentials(true);
          console.error('Invalid client ID or redirect URI.');
          // Handle invalid case (e.g., show an error message, redirect, etc.)
        }
      }
    };

    validateCredentials();
  }, [clientId, redirectUri]);

  return (
    <DevCredentialsContext.Provider
      value={{
        apiKey,
        clientId,
        devLicenseAlias,
        invalidCredentials,
        redirectUri,
        utm,
      }}
    >
      {children}
    </DevCredentialsContext.Provider>
  );
};

// Hook to use the DevCredentialsContext
export const useDevCredentials = () => {
  const context = useContext(DevCredentialsContext);
  if (!context) {
    throw new Error('useDevCredentials must be used within a DevCredentialsProvider');
  }
  return context;
};
