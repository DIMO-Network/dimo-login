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

export const DevCredentialsProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const [devCredentialsState, setDevCredentialsState] = useState({
    clientId: '',
    apiKey: '',
    redirectUri: '',
    utm: '',
    invalidCredentials: false,
    devLicenseAlias: '',
  });
  const { setUiState, setEntryState, setLoadingState, setAltTitle } = useUIManager();

  const configSetters = {
    apiKey: (value: string) =>
      setDevCredentialsState((prev) => ({ ...prev, apiKey: value })),
    redirectUri: (value: string) =>
      setDevCredentialsState((prev) => ({ ...prev, redirectUri: value })),
    utm: (value: string) => setDevCredentialsState((prev) => ({ ...prev, utm: value })),
    clientId: (value: string) =>
      setDevCredentialsState((prev) => ({ ...prev, clientId: value })),
    devLicenseAlias: (value: string) =>
      setDevCredentialsState((prev) => ({ ...prev, devLicenseAlias: value })),
    invalidCredentials: (value: boolean) =>
      setDevCredentialsState((prev) => ({ ...prev, invalidCredentials: value })),
    entryState: (value: UiStates) => {
      setUiState(value);
      setEntryState(value);
    },
    forceEmail: (value: boolean) => setForceEmail(value === true),
    altTitle: (value: boolean) => setAltTitle(value === true),
  };

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

  const processStateFromUrl = (stateFromUrl: string | null) => {
    if (!stateFromUrl) return;

    const {
      clientId,
      emailPermissionGranted = false,
      redirectUri,
      utm,
      entryState = UiStates.EMAIL_INPUT,
      altTitle,
    } = JSON.parse(stateFromUrl);

    setEmailGranted(clientId, emailPermissionGranted);

    if (isStandalone()) {
      applyConfig({
        clientId,
        apiKey: 'api key',
        redirectUri,
        utm,
        entryState,
        altTitle,
      });
    }
  };

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

  useEffect(() => {
    const validateCredentials = async () => {
      const { clientId, redirectUri } = devCredentialsState;

      if (clientId && redirectUri) {
        const { isValid, alias } = await isValidClientId(clientId, redirectUri);
        if (isValid) {
          configSetters.devLicenseAlias(alias);
          createKernelSigner(clientId, clientId, redirectUri);
          setLoadingState(false);
        } else {
          configSetters.invalidCredentials(true);
          console.error('Invalid client ID or redirect URI.');
        }
      }
    };

    validateCredentials();
  }, [devCredentialsState.clientId, devCredentialsState.redirectUri]);

  return (
    <DevCredentialsContext.Provider
      value={{
        apiKey: devCredentialsState.apiKey,
        clientId: devCredentialsState.clientId,
        devLicenseAlias: devCredentialsState.devLicenseAlias,
        invalidCredentials: devCredentialsState.invalidCredentials,
        redirectUri: devCredentialsState.redirectUri,
        utm: devCredentialsState.utm,
      }}
    >
      {children}
    </DevCredentialsContext.Provider>
  );
};

export const useDevCredentials = () => {
  const context = useContext(DevCredentialsContext);
  if (!context) {
    throw new Error('useDevCredentials must be used within a DevCredentialsProvider');
  }
  return context;
};
