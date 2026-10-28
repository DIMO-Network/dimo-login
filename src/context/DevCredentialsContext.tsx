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
import { AuthProvider } from '../utils/authUrls';
import { readOAuthState, readTrustedOAuthReturn } from '../utils/flowSnapshot';
import { reportRefusal } from '../utils/reportRefusal';
import { message, type Text } from '../i18n';
import { useParamsHandler } from '../hooks';
import { getDefaultExpirationDate } from '../utils/dateUtils';
import { sendMessageToReferrer } from '../utils/messageHandler';
import { isStandalone } from '../utils/isStandalone';
import { getEmbedderOrigin, isEmbed } from '../utils/isEmbed';
import { originOf } from '../utils/urlHelpers';
import { getConfigurationById } from '../services/configurationService';
import { CALLER_PARAM_KEYS, filterMessageParams } from '../utils/messageParams';

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
  message: Text;
}

const DEFAULT_LOADING_STATE: LoadingState = {
  isLoading: true,
  message: message('loading.waiting_for_credentials'),
};

// If the SDK's AUTH_INIT never arrives (raced the listener attach, dropped, or
// the parent missed our initial READY), re-announce READY a few times so the
// SDK re-posts credentials instead of leaving the popup stuck on
// "Waiting for credentials…" forever.
const HANDSHAKE_RETRY_INTERVAL_MS = 2000;
const HANDSHAKE_RETRY_LIMIT = 5;

// A CIDv1 in base32, the only form a subdomain gateway takes: the CID becomes
// part of the config's hostname, so anything else could point it elsewhere.
const CID_PATTERN = /^b[a-z2-7]{20,100}$/;

/**
 * The flow to resume after an OAuth provider sends the user back, from the
 * snapshot saved before leaving (flowSnapshot.ts). Google/Apple resume the
 * original flow; Tesla resumes on CONNECT_TESLA, which its state names.
 * Null for a `state` this tab didn't send: nothing from it is applied.
 */
const readOAuthReturnConfig = () => {
  const trusted = readTrustedOAuthReturn();
  if (!trusted) return null;
  const { state, snapshot } = trusted;
  const isTesla = state.provider === AuthProvider.TESLA;
  return {
    ...snapshot,
    entryState: isTesla ? state.entryState : (snapshot.entryState ?? state.entryState),
  };
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
  // Once a KernelSigner is created and auth succeeds, a subsequent re-run of
  // validateCredentials (e.g. due to a stray AUTH_INIT resetting clientId) must
  // NOT replace it — the existing authenticated instance would be lost.
  const kernelSignerInitializedRef = useRef(false);

  const { clientId, redirectUri, waitingForParams, waitingForDevLicense, brandName, entryState } =
    devCredentialsState;

  const parseStateFromUrl = () => {
    if (!new URLSearchParams(window.location.search).get('state')) return false;

    const config = readOAuthReturnConfig();
    if (!config) {
      // The state isn't trusted, so only a provider name we know is reported.
      const provider = readOAuthState()?.provider;
      reportRefusal('untrusted_oauth_return', {
        provider: (Object.values(AuthProvider) as unknown[]).includes(provider)
          ? String(provider)
          : 'unknown',
      });
    }
    applyDevCredentialsConfig(
      config
        ? { ...config, waitingForParams: false }
        : { waitingForParams: false, untrustedOAuthReturn: true },
    );
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
      ...filterMessageParams(parsedUrlParams),
      waitingForParams: false,
    });

    return true;
  };

  const handleAuthInitMessage = (event: MessageEvent) => {
    // Only the window that opened or embeds this one may configure it, and
    // after its AUTH_INIT only from that same origin: another tab or frame
    // could otherwise repoint the flow mid-way.
    if (event.source !== (window.opener || window.parent)) return;
    if (!event.data || typeof event.data !== 'object') return;

    const { eventType, entryState, ...sourceParams } = event.data;

    if (!(eventType in Event)) return;
    const lockedOrigin = callerOriginRef.current;
    if (lockedOrigin !== null && event.origin !== lockedOrigin) return;
    // Action data answers the request AUTH_INIT made; there's none before it.
    if (eventType !== Event.AUTH_INIT && lockedOrigin === null) return;

    // If URL params were already parsed (waitingForParams=false), ignore AUTH_INIT.
    // The popup was opened with a full URL (e.g. PROVISION_DEVELOPER_LICENSE) and
    // the parent page's SDK may still broadcast AUTH_INIT — processing it would
    // overwrite clientId, re-run validateCredentials, and replace the initialized
    // KernelSigner with a fresh unauthenticated one.
    if (eventType === Event.AUTH_INIT && !waitingForParams) return;

    const customParams: Partial<AllParams> = {};
    const params = filterMessageParams(sourceParams);

    if (eventType === Event.AUTH_INIT) {
      callerOriginRef.current = event.origin;
      const fromOAuthReturn = readOAuthReturnConfig();
      const finalEntryState = fromOAuthReturn
        ? (fromOAuthReturn.entryState as string)
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
      CALLER_PARAM_KEYS.forEach((key) => delete params[key]);
    }

    // Allowlist the inbound payload: only keys the app legitimately acts on are
    // written to state. Internal control flags (waitingForDevLicense,
    // invalidCredentials, oemBrand, …) and unknown keys are dropped.
    // customParams is app-computed, not from the wire.
    applyDevCredentialsConfig({
      ...params,
      ...customParams,
    });
  };

  const processConfigByCID = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCID = urlParams.has('configCID');
    const cid = urlParams.get('configCID');

    if (!hasCID || !cid) return false;
    if (!CID_PATTERN.test(cid)) {
      console.error('Ignoring a configCID that is not a base32 CIDv1');
      return false;
    }

    try {
      const config = await fetchConfigFromIPFS(cid);

      applyDevCredentialsConfig({
        ...filterMessageParams(config),
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

    try {
      const config = await getConfigurationById(configurationId!);
      applyDevCredentialsConfig({
        ...filterMessageParams(config.configuration),
        waitingForParams: false,
        clientId: config.client_id,
      });
      return true;
    } catch (error) {
      // A deleted configuration or a console outage: stop waiting, so the
      // missing-credentials error shows instead of an endless spinner.
      console.error('Failed to load configuration by ID:', error);
      applyDevCredentialsConfig({ waitingForParams: false });
      return true;
    }
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
    // PROVISION_DEVELOPER_LICENSE: the calling app may not be a registered
    // developer and its redirectUri won't be registered on-chain yet — that's
    // what this flow sets up. Skip all license validation so KernelSigner is
    // always initialized and the user can proceed to provisioning.
    const isProvisionFlow = entryState === UiStates.PROVISION_DEVELOPER_LICENSE;
    const isRegistered = isProvisionFlow
      ? true
      : await isValidDeveloperLicense(licenseData, redirectUri);
    if (isStale()) return;

    // A popup's opener and an embedding page must be the app itself: answers
    // go to the redirect URI's origin, so any other page would be driving
    // the screens (or clicks) for an app it isn't. Provisioning included,
    // since its key goes to that origin.
    const appOrigin = originOf(redirectUri);
    const callers = [
      callerOriginRef.current,
      isEmbed() ? (getEmbedderOrigin() ?? 'unknown') : null,
    ].filter((origin): origin is string => origin !== null);
    const fromApp = callers.every((origin) => origin === appOrigin);
    const isValid = isRegistered && fromApp;

    applyDevCredentialsConfig({
      devLicenseAlias: alias,
      oemBrand: brand,
      invalidCredentials: !isValid,
      untrustedCaller: !fromApp,
      waitingForDevLicense: false,
    });

    if (!isValid) {
      if (!fromApp) {
        reportRefusal('untrusted_caller', {
          clientId,
          appOrigin,
          callers: callers.join(', '),
          mode: isEmbed() ? 'embed' : 'popup',
        });
      }
      console.error(
        fromApp
          ? 'Invalid client ID or redirect URI.'
          : `This page (${callers.join(', ')}) isn't the redirect URI's origin (${appOrigin}).`,
      );
      return;
    }

    if (!kernelSignerInitializedRef.current) {
      kernelSignerInitializedRef.current = true;
      createKernelSigner(clientId, clientId, redirectUri);
    }
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
  // The origin of the accepted AUTH_INIT: the only one later messages may come from.
  const callerOriginRef = useRef<string | null>(null);

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
  }, [clientId, redirectUri]);

  useEffect(() => {
    setLoadingState({
      isLoading: waitingForParams || waitingForDevLicense,
      message: message('loading.waiting_for_credentials'),
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
