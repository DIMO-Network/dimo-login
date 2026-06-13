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
  useRef,
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
import { fetchOemBrand, readCachedBrand } from '../services/brandService';
import { setEmailGranted } from '../services/storageService';
import { useParamsHandler } from '../hooks';
import { getDefaultExpirationDate } from '../utils/dateUtils';
import { sendMessageToReferrer } from '../utils/messageHandler';
import { isStandalone } from '../utils/isStandalone';
import { getConfigurationById } from '../services/configurationService';
import { filterMessageParams } from '../utils/messageParams';

const DEFAULT_CONTEXT: AllParams = {
  clientId: null,
  redirectUri: '',
  waitingForParams: true,
  waitingForDevLicense: true,
  utm: '',
  apiKey: 'api key',
  invalidCredentials: true,
  devLicenseAlias: '',
  oemBrand: null,
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

// If the SDK's AUTH_INIT never arrives (raced the listener attach, dropped, or
// the parent missed our initial READY), re-announce READY a few times so the
// SDK re-posts credentials instead of leaving the popup stuck on
// "Waiting for credentials…" forever.
const HANDSHAKE_RETRY_INTERVAL_MS = 2000;
const HANDSHAKE_RETRY_LIMIT = 5;

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

  const { clientId, redirectUri, waitingForParams, waitingForDevLicense, brandName } =
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

    const parsedUrlParams: Record<string, unknown> = {};

    // @ts-ignore
    for (const [key, value] of urlParams.entries()) {
      if (parsedUrlParams[key]) {
        parsedUrlParams[key] = Array.isArray(parsedUrlParams[key])
          // @ts-ignore
          ? [...parsedUrlParams[key], value]
          : [parsedUrlParams[key], value];
      } else {
        parsedUrlParams[key] = value;
      }
    }
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

      if (finalEntryState && finalEntryState in EventByUiState) {
        sendMessageToReferrer({
          eventType: EventByUiState[finalEntryState as keyof typeof EventByUiState],
        });
      }
    } else {
      customParams.waitingForParams = false;
    }

    // Allowlist the inbound payload: a postMessage can come from any window, so
    // only keys the app legitimately acts on are written to state. Internal
    // control flags (waitingForDevLicense, invalidCredentials, oemBrand, …) and
    // unknown keys are dropped. customParams is app-computed, not from the wire.
    applyDevCredentialsConfig({
      ...filterMessageParams(sourceParams),
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

  const processConfigByConfigId = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasConfigurationId = urlParams.has('configurationId');
    const configurationId = urlParams.get('configurationId');
    if (!hasConfigurationId || !configurationId) return false;

    const config = await getConfigurationById(configurationId!);

    applyDevCredentialsConfig({
      ...config.configuration,
      waitingForParams: false,
      clientId: config.client_id,
    });

    return true;
  };

  const validateCredentials = async () => {
    // Guard against overlapping runs: a late AUTH_INIT can change clientId while a
    // previous validation is still awaiting, and the slower run would otherwise
    // overwrite the newer one's state out of order. Each run claims a sequence
    // number and bails if a newer run has started.
    const seq = ++validateSeqRef.current;
    const isStale = () => seq !== validateSeqRef.current;

    applyDevCredentialsConfig({
      waitingForDevLicense: Boolean(clientId),
    });

    if (!clientId) return;

    // Paint the last-known OEM logo immediately (from localStorage) so the
    // "Waiting for credentials…" loading screen is branded instead of flashing
    // the default DIMO mark while the brand fetch below is in flight. The live
    // fetch still runs and overwrites this with the canonical record.
    const cachedBrand = readCachedBrand(clientId);
    if (cachedBrand) {
      applyDevCredentialsConfig({ oemBrand: cachedBrand });
    }

    // Brand fetch runs in parallel with identity-api lookups so the OEM logo
    // can paint as soon as both the license check and brand-record fetch
    // finish — no extra round-trip latency added to the existing flow.
    //
    // brandName comes from state, not the URL: popup mode opens at the bare
    // base URL (no query string), so the SDK delivers brandName via the
    // AUTH_INIT postMessage. State is the one place both transports converge —
    // applyDevCredentialsConfig deposits it there in the same batch that sets
    // clientId. Reading the URL here would silently drop the popup case.
    const [licenseData, brand] = await Promise.all([
      getDeveloperLicense(clientId),
      fetchOemBrand(clientId, brandName),
    ]);
    if (isStale()) return;
    const alias = await getLicenseAlias(licenseData, clientId);
    if (isStale()) return;
    const isValid = await isValidDeveloperLicense(licenseData, redirectUri);
    if (isStale()) return;

    applyDevCredentialsConfig({
      devLicenseAlias: alias,
      oemBrand: brand,
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
    }
    // Note: the 'message' listener is attached synchronously at mount (see the
    // mount effect below), NOT here — registering it here ran only after the
    // awaited config resolution in initAuthProcess, so a fast AUTH_INIT could
    // land before the listener existed and be dropped, hanging the popup.
  };

  // Always-latest handler behind a stable ref so the mount effect can attach a
  // single listener whose identity never changes (the previous code added one
  // closure and removed a different per-render closure, so it never detached).
  const handleAuthInitMessageRef = useRef(handleAuthInitMessage);
  handleAuthInitMessageRef.current = handleAuthInitMessage;

  // Monotonic counter so an in-flight validateCredentials run can detect it has
  // been superseded by a newer clientId and stop writing stale state.
  const validateSeqRef = useRef(0);

  const initAuthProcess = async () => {
    const isProcessedByConfigId = await processConfigByConfigId();
    const isProcessedByCID = await processConfigByCID();
    const isProcessedByUrl = parseUrlParams();
    const isConfiguredByUrl =
      isProcessedByCID || isProcessedByUrl || isProcessedByConfigId;

    // Recovering config from state for social sign-in
    parseStateFromUrl();

    if (!isConfiguredByUrl) {
      setupPopupConfig();
    }
  };

  useEffect(() => {
    // Attach the AUTH_INIT listener BEFORE kicking off any awaited config work,
    // so a fast AUTH_INIT can never land in the gap. The listener identity is
    // stable (delegates to the ref), so its cleanup reliably removes it.
    const onMessage = (event: MessageEvent) => handleAuthInitMessageRef.current(event);
    if (!isStandalone()) {
      window.addEventListener('message', onMessage);
    }
    void initAuthProcess();
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handshake fallback: while still waiting for params (popup/embed only),
  // re-announce READY on an interval until the SDK responds or we hit the cap.
  // This is what breaks the intermittent "stuck on Waiting for credentials…"
  // deadlock when the initial AUTH_INIT is missed.
  useEffect(() => {
    if (isStandalone() || !waitingForParams) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      sendMessageToReferrer({ eventType: 'READY' });
      if (attempts >= HANDSHAKE_RETRY_LIMIT) clearInterval(id);
    }, HANDSHAKE_RETRY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [waitingForParams]);

  useEffect(() => {
    void validateCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    setLoadingState({
      isLoading: waitingForParams || waitingForDevLicense,
      message: 'Waiting for credentials...',
    });
  }, [waitingForParams, waitingForDevLicense]);

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
