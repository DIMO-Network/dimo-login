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
  useEffect,
  ReactElement,
} from 'react';

import { AllParams } from '../types';
import { createKernelSigner } from '../services/turnkeyService';
import { Event, EventByUiState, UiStates } from '../enums';
import { fetchConfigFromIPFS } from '../services';
import {
  getDeveloperLicense,
  getLicenseAlias,
  isValidDeveloperLicense,
} from '../services/identityService';
import { setEmailGranted } from '../services/storageService';
import { useUIManager } from './UIManagerContext';
import { useParamsHandler } from '../hooks';
import { getDefaultExpirationDate } from '../utils/dateUtils';
import { sendMessageToReferrer } from '../utils/messageHandler';

const DEFAULT_CONTEXT: AllParams = {
  clientId: '',
  redirectUri: '',
  waitingForParams: true,
  utm: '',
  apiKey: 'api key',
  invalidCredentials: false,
  devLicenseAlias: '',
  entryState: UiStates.EMAIL_INPUT,
  altTitle: false,
  forceEmail: false,
  vehicleTokenIds: [],
  vehicleMakes: [],
  powertrainTypes: [],
  expirationDate: getDefaultExpirationDate(),
  newVehicleSectionDescription: '',
  shareVehiclesSectionDescription: '',
};

const DevCredentialsContext = createContext<AllParams>(DEFAULT_CONTEXT);

export const DevCredentialsProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const { devCredentialsState, applyDevCredentialsConfig } =
    useParamsHandler(DEFAULT_CONTEXT);
  const { setLoadingState } = useUIManager();

  const { entryState, clientId, redirectUri, waitingForParams, devLicenseAlias } =
    devCredentialsState;

  const parseStateFromUrl = (stateFromUrl: string | null) => {
    if (!stateFromUrl) return false;

    const { emailPermissionGranted = false, ...parsedState } = JSON.parse(stateFromUrl);

    applyDevCredentialsConfig(parsedState);
    setEmailGranted(devCredentialsState.clientId!, emailPermissionGranted);
    applyDevCredentialsConfig({ waitingForParams: false });

    return true;
  };

  const parseUrlParams = (urlParams: URLSearchParams) => {
    const parsedUrlParams = Object.fromEntries(urlParams.entries());

    if (!parsedUrlParams.clientId) return false;

    applyDevCredentialsConfig(parsedUrlParams);
    applyDevCredentialsConfig({ waitingForParams: false });

    return true;
  };

  const handleAuthInitMessage = (event: MessageEvent) => {
    const urlParams = new URLSearchParams(window.location.search);
    const stateFromUrl = urlParams.get('state');

    const { eventType, entryState, ...sourceParams } = event.data;

    if (!(eventType in Event)) return;

    const customParams: Partial<AllParams> = {};

    if (eventType === Event.AUTH_INIT) {
      const finalEntryState = stateFromUrl
        ? JSON.parse(stateFromUrl).entryState
        : entryState || UiStates.EMAIL_INPUT;

      customParams.entryState = finalEntryState;
    }

    if (entryState in EventByUiState) {
      if (EventByUiState[entryState as keyof typeof EventByUiState] === eventType) {
        customParams.waitingForParams = false;
      }
    } else {
      customParams.waitingForParams = false;
    }

    applyDevCredentialsConfig({
      ...sourceParams,
      ...customParams,
    });
  };

  const processConfigByCID = async (cid: string | null) => {
    if (!cid) return false;
    try {
      const config = await fetchConfigFromIPFS(cid);

      applyDevCredentialsConfig(config);
      applyDevCredentialsConfig({ waitingForParams: false });

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

    applyDevCredentialsConfig({
      configCID: configCIDFromUrl || '',
    });

    const isConfiguredByUrl =
      (await processConfigByCID(configCIDFromUrl)) || parseUrlParams(urlParams);

    // Recovering config from state for social sign-in
    parseStateFromUrl(stateFromUrl);

    if (!isConfiguredByUrl) {
      window.addEventListener('message', handleAuthInitMessage);
      const { entryState } = devCredentialsState;

      if (entryState && entryState in EventByUiState) {
        sendMessageToReferrer({
          eventType: EventByUiState[entryState as keyof typeof EventByUiState],
        });
        applyDevCredentialsConfig({
          waitingForParams: true,
        });
      }
    }
  };

  useEffect(() => {
    initAuthProcess();

    return () => {
      window.removeEventListener('message', handleAuthInitMessage);
    };
  }, [entryState]);

  useEffect(() => {
    const validateCredentials = async () => {
      const { clientId, redirectUri } = devCredentialsState;

      if (clientId) {
        const licenseData = await getDeveloperLicense(clientId);
        const alias = await getLicenseAlias(licenseData, clientId);
        const isValid = await isValidDeveloperLicense(licenseData, redirectUri);
        applyDevCredentialsConfig({
          devLicenseAlias: alias,
        });

        if (isValid) {
          createKernelSigner(clientId, clientId, redirectUri);
        } else {
          applyDevCredentialsConfig({
            invalidCredentials: true,
          });
          console.error('Invalid client ID or redirect URI.');
        }
      }
    };

    validateCredentials();
  }, [clientId, redirectUri]);

  useEffect(() => {
    const { waitingForParams, devLicenseAlias } = devCredentialsState;
    if (!waitingForParams && !devLicenseAlias) {
      setLoadingState(false);
    }
  }, [waitingForParams, devLicenseAlias]);

  return (
    <DevCredentialsContext.Provider value={devCredentialsState}>
      {children}
    </DevCredentialsContext.Provider>
  );
};

export const useDevCredentials = <T extends AllParams>() => {
  const context = useContext(DevCredentialsContext);
  if (!context) {
    throw new Error('useDevCredentials must be used within a DevCredentialsProvider');
  }
  return context as T;
};
