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
  useState,
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
import { useParamsHandler } from '../hooks';
import { getDefaultExpirationDate } from '../utils/dateUtils';
import { sendMessageToReferrer } from '../utils/messageHandler';
import { isStandalone } from '../utils/isStandalone';

const DEFAULT_CONTEXT: AllParams = {
  clientId: '',
  redirectUri: '',
  waitingForParams: true,
  waitingForDevLicense: true,
  utm: '',
  apiKey: 'api key',
  invalidCredentials: true,
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

interface LoadingState {
  isLoading: boolean;
  message: string;
}

const DEFAULT_LOADING_STATE: LoadingState = {
  isLoading: true,
  message: 'Waiting for credentials...',
};

const DevCredentialsContext = createContext<AllParams & { loadingState: LoadingState }>({
  ...DEFAULT_CONTEXT,
  loadingState: DEFAULT_LOADING_STATE,
});

export const DevCredentialsProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const { devCredentialsState, applyDevCredentialsConfig } =
    useParamsHandler(DEFAULT_CONTEXT);
  const [loadingState, setLoadingState] = useState(DEFAULT_LOADING_STATE);

  const { clientId, redirectUri, waitingForParams, waitingForDevLicense, entryState } =
    devCredentialsState;

  const parseStateFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasState = urlParams.has('state');
    const stateFromUrl = urlParams.get('state');
    if (!hasState || !stateFromUrl) return false;

    const { emailPermissionGranted = false, ...parsedState } = JSON.parse(stateFromUrl);

    applyDevCredentialsConfig({
      ...parsedState,
      waitingForParams: false,
    });
    setEmailGranted(devCredentialsState.clientId!, emailPermissionGranted);

    return true;
  };

  const parseUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasClientId = urlParams.has('clientId');

    if (!hasClientId) return false;

    const parsedUrlParams = Object.fromEntries(urlParams.entries());
    applyDevCredentialsConfig({
      ...parsedUrlParams,
      waitingForParams: false,
    });

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
      customParams.waitingForParams = finalEntryState in EventByUiState;

      if (entryState && entryState in EventByUiState) {
        sendMessageToReferrer({
          eventType: EventByUiState[entryState as keyof typeof EventByUiState],
        });
      }
    } else {
      customParams.waitingForParams = false;
    }

    applyDevCredentialsConfig({
      ...sourceParams,
      ...customParams,
    });
  };

  const processConfigByCID = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCID = urlParams.has('configCID');
    const cid = urlParams.get('configCID');

    if (!hasCID || !cid) return false;

    try {
      const config = await fetchConfigFromIPFS(cid);

      applyDevCredentialsConfig({
        ...config,
        waitingForParams: false,
        configCID: cid,
      });

      return true;
    } catch (error) {
      console.error('Failed to process configuration by CID:', error);
      return false;
    }
  };

  const validateCredentials = async () => {
    applyDevCredentialsConfig({
      waitingForDevLicense: Boolean(clientId),
    });

    if (!clientId) return;

    const licenseData = await getDeveloperLicense(clientId);
    const alias = await getLicenseAlias(licenseData, clientId);
    const isValid = await isValidDeveloperLicense(licenseData, redirectUri);

    applyDevCredentialsConfig({
      devLicenseAlias: alias,
      invalidCredentials: !isValid,
      waitingForDevLicense: false,
    });

    if (!isValid) {
      console.error('Invalid client ID or redirect URI.');
      return;
    }

    createKernelSigner(clientId, clientId, redirectUri);
  };

  const setupPopupConfig = () => {
    if (isStandalone()) {
      applyDevCredentialsConfig({
        waitingForParams: false,
      });
      return;
    }

    window.addEventListener('message', handleAuthInitMessage);
  };

  const initAuthProcess = async () => {
    const isProcessedByCID = await processConfigByCID();
    const isProcessedByUrl = parseUrlParams();
    const isConfiguredByUrl = isProcessedByCID || isProcessedByUrl;

    // Recovering config from state for social sign-in
    parseStateFromUrl();

    if (!isConfiguredByUrl) {
      setupPopupConfig();
    }
  };

  useEffect(() => {
    initAuthProcess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryState]);

  useEffect(() => {
    validateCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    const isLoading = waitingForParams || waitingForDevLicense;
    setLoadingState({ isLoading, message: 'Waiting for credentials...' });

    return () => {
      window.removeEventListener('message', handleAuthInitMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState.isLoading, waitingForParams, waitingForDevLicense, clientId]);

  return (
    <DevCredentialsContext.Provider value={{ ...devCredentialsState, loadingState }}>
      {children}
    </DevCredentialsContext.Provider>
  );
};

export const useDevCredentials = <T extends AllParams>() => {
  const context = useContext(DevCredentialsContext);
  if (!context) {
    throw new Error('useDevCredentials must be used within a DevCredentialsProvider');
  }
  return context as T & { loadingState: LoadingState };
};
