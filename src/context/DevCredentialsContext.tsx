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
} from "react";

import { createKernelSigner } from "../services/turnkeyService";
import { CredentialParams } from "../types";
import { isStandalone } from "../utils/isStandalone";
import { isValidClientId } from "../services/identityService";
import { setEmailGranted } from "../services/storageService";
import { setForceEmail } from "../stores/AuthStateStore";
import { UiStates, useUIManager } from "./UIManagerContext";

interface DevCredentialsContextProps {
  apiKey: string;
  clientId: string;
  devLicenseAlias: string;
  invalidCredentials: boolean;
  redirectUri: string;
  utm: string;
}

const DevCredentialsContext = createContext<
  DevCredentialsContextProps | undefined
>(undefined);

// Provider component for Dev Credentials
export const DevCredentialsProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [clientId, setClientId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [utm, setUtm] = useState<string>("");
  const [invalidCredentials, setInvalidCredentials] = useState<boolean>(false);
  const [devLicenseAlias, setDevLicenseAlias] = useState<string>(""); // Alias will only be set if credentials are valid, defaults to client ID if not alias
  const { setUiState, setEntryState, setLoadingState, setAltTitle } = useUIManager();

  // Example of using postMessage to receive credentials (as described previously)
  useEffect(() => {
    setLoadingState(true, "Waiting for credentials...");
    const urlParams = new URLSearchParams(window.location.search);

    const clientIdFromUrl = urlParams.get("clientId");
    const redirectUriFromUrl = urlParams.get("redirectUri");
    const entryStateFromUrl = urlParams.get("entryState") as UiStates;
    const forceEmailFromUrl = urlParams.get("forceEmail");
    const stateFromUrl = urlParams.get("state");
    const utmFromUrl = urlParams.get("utm");
    const altTitleFromUrl = urlParams.get("altTitle") === "true";

    // ✅ Handle state from URL (e.g., for SSO / OAuth Redirects)
    const processStateFromUrl = () => {
      if (!stateFromUrl) return;

      const state = JSON.parse(stateFromUrl);

      //We have to set this in state param, since we lose it for SSO
      //We could do this setting in Email Input, however since we're already parsing state here, it feels more natural to put it here
      //This sets email granted property to true/false in storage
      //Then when we build the auth payload, it should be retrievable
      setEmailGranted(state.clientId, state.emailPermissionGranted || false);

      if (isStandalone()) {
        // ✅ If standalone, use state params instead of waiting for SDK
        setUiState(state.entryState || UiStates.EMAIL_INPUT);
        setEntryState(state.entryState || UiStates.EMAIL_INPUT);
        setCredentials({
          clientId: state.clientId,
          apiKey: "api key",
          redirectUri: state.redirectUri,
          utm: state.utm,
        });
        setAltTitle(state.altTitle);
      }
    };

    // ✅ Handle initialization from URL params (popup mode)
    const processUrlParams = () => {
      if (!clientIdFromUrl || !redirectUriFromUrl) return false;

      setUiState(entryStateFromUrl || UiStates.EMAIL_INPUT);
      setEntryState(entryStateFromUrl || UiStates.EMAIL_INPUT);
      setForceEmail(forceEmailFromUrl === "true");
      setCredentials({
        clientId: clientIdFromUrl,
        apiKey: "api key",
        redirectUri: redirectUriFromUrl,
        utm: utmFromUrl,
      });
      setAltTitle(altTitleFromUrl);

      return true;
    };

    // ✅ Handle message events from SDK (popup mode)
    const handleMessage = (event: MessageEvent) => {
      const {
        eventType,
        clientId,
        apiKey,
        redirectUri,
        entryState,
        forceEmail,
        altTitle,
      } = event.data;

      if (eventType === "AUTH_INIT") {
        console.log("Received AUTH_INIT message", event);
        const finalEntryState = stateFromUrl
          ? JSON.parse(stateFromUrl).entryState
          : entryState || UiStates.EMAIL_INPUT;

        setUiState(finalEntryState);
        setEntryState(finalEntryState);
        setForceEmail(forceEmail);
        setCredentials({ clientId, apiKey, redirectUri });
        setAltTitle(altTitle);
      }
    };

    processStateFromUrl();

    if (!processUrlParams()) {
      window.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, []);

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
          console.error("Invalid client ID or redirect URI.");
          // Handle invalid case (e.g., show an error message, redirect, etc.)
        }
      }
    };

    validateCredentials();
  }, [clientId, redirectUri]);

  const setCredentials = ({
    clientId,
    apiKey,
    redirectUri,
    utm,
  }: CredentialParams) => {
    setClientId(clientId);
    setApiKey(apiKey);
    setRedirectUri(redirectUri);
    setLoadingState(false);
    if (utm) setUtm(utm);
  };

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
    throw new Error(
      "useDevCredentials must be used within a DevCredentialsProvider"
    );
  }
  return context;
};
