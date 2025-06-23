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
import { setForceEmail } from '../stores/AuthStateStore';
import { parseExpirationDate, getDefaultExpirationDate } from '../utils/dateUtils';
import { useOracles } from './OraclesContext';
import { useUIManager } from './UIManagerContext';
import { TransactionData } from '@dimo-network/transactions';
import { sendMessageToReferrer } from '../utils/messageHandler';

const DEFAULT_CONTEXT: AllParams = {
  clientId: '',
  redirectUri: '',
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
  const [devCredentialsState, setDevCredentialsState] =
    useState<AllParams>(DEFAULT_CONTEXT);
  const { setUiState, setEntryState, setLoadingState, setAltTitle } = useUIManager();
  const { setOnboardingEnabled } = useOracles();

  const specialSetters = {
    entryState: (value: unknown) => {
      if (typeof value !== 'string' || !(value in UiStates)) return;
      setUiState(value as UiStates);
      setEntryState(value as UiStates);
      setDevCredentialsState((prev) => ({
        ...prev,
        entryState: value as UiStates,
      }));
    },
    forceEmail: (value: unknown) => {
      setForceEmail(Boolean(value));
      setDevCredentialsState((prev) => ({
        ...prev,
        forceEmail: Boolean(value),
      }));
    },
    altTitle: (value: unknown) => {
      setAltTitle(Boolean(value));
      setDevCredentialsState((prev) => ({
        ...prev,
        altTitle: Boolean(value),
      }));
    },
    vehicles: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        vehicleTokenIds: Array.isArray(value) ? value : [value],
      })),
    vehicleMakes: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        vehicleMakes: Array.isArray(value) ? value : [value],
      })),
    powertrainTypes: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        powertrainTypes: Array.isArray(value) ? value : [value],
      })),
    expirationDate: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        expirationDate: value
          ? parseExpirationDate(String(value))
          : getDefaultExpirationDate(),
      })),
    region: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        region: String(value).toUpperCase(),
      })),
    onboarding: (value: unknown) => setOnboardingEnabled(Boolean(String(value).length)),
    transactionData: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        transactionData: (typeof value === 'string'
          ? JSON.parse(decodeURIComponent(value))
          : value) as TransactionData,
      })),
  };

  const applyDevCredentialsConfig = (config: Record<string, unknown>) => {
    Object.entries(config).forEach(([key, value]) => {
      if (
        key in specialSetters &&
        specialSetters[key as keyof typeof specialSetters] &&
        value !== undefined
      ) {
        specialSetters[key as keyof typeof specialSetters](value);
      } else {
        setDevCredentialsState((prev) => ({
          ...prev,
          [key]: value,
        }));
      }
    });
  };

  const parseStateFromUrl = (stateFromUrl: string | null) => {
    if (!stateFromUrl) return false;

    const { emailPermissionGranted = false, ...parsedState } = JSON.parse(stateFromUrl);

    applyDevCredentialsConfig(parsedState);
    setEmailGranted(devCredentialsState.clientId!, emailPermissionGranted);

    return true;
  };

  const parseUrlParams = (urlParams: URLSearchParams) => {
    const parsedUrlParams = Object.fromEntries(urlParams.entries());

    if (!parsedUrlParams.clientId) return false;

    applyDevCredentialsConfig(parsedUrlParams);

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

    setDevCredentialsState((prev) => ({
      ...prev,
      configCID: configCIDFromUrl || '',
    }));

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
      }
    }
  };

  useEffect(() => {
    initAuthProcess();

    return () => {
      window.removeEventListener('message', handleAuthInitMessage);
    };
  }, [devCredentialsState.entryState]);

  useEffect(() => {
    const validateCredentials = async () => {
      const { clientId, redirectUri } = devCredentialsState;

      if (clientId) {
        const licenseData = await getDeveloperLicense(clientId);
        const alias = await getLicenseAlias(licenseData, clientId);
        const isValid = await isValidDeveloperLicense(licenseData, redirectUri);
        setDevCredentialsState((prev) => ({
          ...prev,
          devLicenseAlias: alias,
        }));

        if (isValid) {
          createKernelSigner(clientId, clientId, redirectUri);
          setLoadingState(false);
        } else {
          setDevCredentialsState((prev) => ({
            ...prev,
            invalidCredentials: true,
          }));
          console.error('Invalid client ID or redirect URI.');
        }
      }
    };

    validateCredentials();
  }, [devCredentialsState.clientId, devCredentialsState.redirectUri]);

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
