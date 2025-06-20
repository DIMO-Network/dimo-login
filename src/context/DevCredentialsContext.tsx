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
import {
  getDeveloperLicense,
  isValidDeveloperLicense,
  getLicenseAlias,
} from '../services/identityService';
import { setEmailGranted } from '../services/storageService';
import { setForceEmail } from '../stores/AuthStateStore';
import { UiStates } from '../enums';
import { useUIManager } from './UIManagerContext';
import { fetchConfigFromIPFS } from '../services';
import { AllParams } from '../types';

interface DevCredentialsContextProps extends AllParams {
  devLicenseAlias: string;
  invalidCredentials: boolean;
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
    configCID: '',
    newVehicleSectionDescription: '',
    shareVehiclesSectionDescription: '',
    entryState: UiStates.EMAIL_INPUT,
    altTitle: false,
    forceEmail: false,
  });
  const { setUiState, setEntryState, setLoadingState, setAltTitle } = useUIManager();

  const specialSetters = {
    entryState: (value: UiStates) => {
      setUiState(value);
      setEntryState(value);
    },
    forceEmail: (value: boolean) => setForceEmail(Boolean(value)),
    altTitle: (value: boolean) => setAltTitle(Boolean(value)),
  };

  const applyDevCredentialsConfig = (config: Record<string, unknown>) => {
    const finalConfig = {
      ...config,
      entryState: (config.entryState as UiStates) ?? UiStates.EMAIL_INPUT,
    };
    Object.entries(finalConfig).forEach(([key, value]) => {
      if (
        key in specialSetters &&
        specialSetters[key as keyof typeof specialSetters] &&
        value !== undefined
      ) {
        specialSetters[key as keyof typeof specialSetters](value as never);
      } else {
        setDevCredentialsState((prev) => ({ ...prev, [key]: value }));
      }
    });
  };

  const parseStateFromUrl = (stateFromUrl: string | null) => {
    if (!stateFromUrl) return false;

    const {
      clientId,
      emailPermissionGranted = false,
      redirectUri,
      utm,
      entryState = UiStates.EMAIL_INPUT,
      altTitle,
    } = JSON.parse(stateFromUrl);

    setEmailGranted(clientId, emailPermissionGranted);

    applyDevCredentialsConfig({
      clientId,
      apiKey: 'api key',
      redirectUri,
      utm,
      entryState,
      altTitle,
    });

    return true;
  };

  const parseUrlParams = (urlParams: URLSearchParams) => {
    const clientIdFromUrl = urlParams.get('clientId');
    const redirectUriFromUrl = urlParams.get('redirectUri');

    if (!clientIdFromUrl) return false;

    applyDevCredentialsConfig({
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

  const handleAuthInitMessage = (event: MessageEvent, stateFromUrl: string | null) => {
    const { eventType, clientId, apiKey, redirectUri, entryState, forceEmail, altTitle } =
      event.data;

    if (eventType === 'AUTH_INIT') {
      console.log('Received AUTH_INIT message', event);
      const finalEntryState = stateFromUrl
        ? JSON.parse(stateFromUrl).entryState
        : entryState || UiStates.EMAIL_INPUT;

      applyDevCredentialsConfig({
        clientId,
        apiKey,
        redirectUri,
        entryState: finalEntryState,
        forceEmail,
        altTitle,
      });
    }
  };

  const processConfigByCID = async (cid: string | null) => {
    if (!cid) return false;
    try {
      const config = await fetchConfigFromIPFS(cid);
      applyDevCredentialsConfig({
        ...config,
        apiKey: 'api key',
      });
      return true;
    } catch (error) {
      console.error('Failed to process configuration by CID:', error);
      return false;
    }
  };

  const initAuthProcess = async () => {
    setLoadingState(true, 'Waiting for credentials...');
    const urlParams = new URLSearchParams(window.location.search);
    const stateFromUrl = urlParams.get('state');
    const configCIDFromUrl = urlParams.get('configCID');

    setDevCredentialsState((prev) => ({ ...prev, configCID: configCIDFromUrl || '' }));

    const isConfiguredByUrl =
      (await processConfigByCID(configCIDFromUrl)) || parseUrlParams(urlParams);

    // Recovering config from state for social sign-in
    parseStateFromUrl(stateFromUrl);

    if (!isConfiguredByUrl) {
      const messageHandler = (event: MessageEvent) =>
        handleAuthInitMessage(event, stateFromUrl);
      window.addEventListener('message', messageHandler);
      return () => {
        window.removeEventListener('message', messageHandler);
      };
    }
  };

  useEffect(() => {
    initAuthProcess();
  }, []);

  useEffect(() => {
    const validateCredentials = async () => {
      const { clientId, redirectUri } = devCredentialsState;

      if (clientId) {
        const licenseData = await getDeveloperLicense(clientId);
        const alias = await getLicenseAlias(licenseData, clientId);
        const isValid = await isValidDeveloperLicense(licenseData, redirectUri);
        setDevCredentialsState((prev) => ({ ...prev, devLicenseAlias: alias }));

        if (isValid) {
          createKernelSigner(clientId, clientId, redirectUri);
          setLoadingState(false);
        } else {
          setDevCredentialsState((prev) => ({ ...prev, invalidCredentials: true }));
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
        configCID: devCredentialsState.configCID,
        newVehicleSectionDescription: devCredentialsState.newVehicleSectionDescription,
        shareVehiclesSectionDescription:
          devCredentialsState.shareVehiclesSectionDescription,
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
