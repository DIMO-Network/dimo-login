import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  ReactElement,
} from "react";
import { createKernelSigner } from "../services/turnkeyService";
import { CredentialParams } from "../types";
import { isStandalone } from "../utils/isStandalone";
import {checkIfRedirectUriIsValid, fetchDeveloperLicenseByClientId} from "../services/identityService";
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

export const DevCredentialsProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const [clientId, setClientId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [utm, setUtm] = useState<string>("");
  const [invalidCredentials, setInvalidCredentials] = useState<boolean>(false);
  const [devLicenseAlias, setDevLicenseAlias] = useState<string>(""); // Alias will only be set if credentials are valid, defaults to client ID if not alias
  const { setUiState, setEntryState, setLoadingState, setAltTitle } = useUIManager();

  const extractParametersFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get("clientId");
    const redirectUri = urlParams.get("redirectUri");
    const entryState = urlParams.get("entryState") as UiStates;
    const forceEmail = urlParams.get("forceEmail");
    const state = urlParams.get("state");
    const utm = urlParams.get("utm");
    const altTitle = urlParams.get("altTitle") === "true";
    return {
      clientId,
      redirectUri,
      entryState,
      forceEmail,
      state,
      utm,
      altTitle
    }
  }

  const setStateFromUrlParams = () => {
    const {clientId, redirectUri, entryState, forceEmail, altTitle} = extractParametersFromUrl();
    if (!clientId || !redirectUri) return false;
    setUiState(entryState || UiStates.EMAIL_INPUT);
    setEntryState(entryState || UiStates.EMAIL_INPUT);
    setForceEmail(forceEmail === "true");
    setDevLicenseCredentials({
      clientId: clientId,
      apiKey: "api key",
      redirectUri: redirectUri,
      utm: utm,
    });
    setAltTitle(altTitle);
    return true;
  };

  const setStateFromOriginMessage = (event: MessageEvent) => {
    const {state: stateFromUrl} = extractParametersFromUrl();

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
      const finalEntryState = stateFromUrl
        ? JSON.parse(stateFromUrl).entryState
        : entryState || UiStates.EMAIL_INPUT;

      setUiState(finalEntryState);
      setEntryState(finalEntryState);
      setForceEmail(forceEmail);
      setDevLicenseCredentials({ clientId, apiKey, redirectUri });
      setAltTitle(altTitle);
    }
  };

  const setStateFromOAuthRedirect = () => {
    const {state: stateFromUrl} = extractParametersFromUrl();
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
      setDevLicenseCredentials({
        clientId: state.clientId,
        apiKey: "api key",
        redirectUri: state.redirectUri,
        utm: state.utm,
      });
      setAltTitle(state.altTitle);
    }
  };

  // Example of using postMessage to receive credentials (as described previously)
  useEffect(() => {
    setLoadingState(true, "Waiting for credentials...");
    setStateFromOAuthRedirect();
    const successFromUrlParams = setStateFromUrlParams();
    if (!successFromUrlParams) {
      window.addEventListener("message", setStateFromOriginMessage);
      return () => {
        window.removeEventListener("message", setStateFromOriginMessage);
      };
    }
  }, []);

  useEffect(() => {
    const validateCredentials = async () => {
      if (clientId && redirectUri) {
        try {
          const license = await fetchDeveloperLicenseByClientId(clientId);
          if (!license) { return setInvalidCredentials(true); }
          const isValid = checkIfRedirectUriIsValid(license, redirectUri);
          if (!isValid) { return setInvalidCredentials(true); }
          setDevLicenseAlias(license.alias);
          createKernelSigner(clientId, clientId, redirectUri);
          setLoadingState(false);
        } catch (err) {
          setInvalidCredentials(true);
        }
      }
    };
    validateCredentials();
  }, [clientId, redirectUri]);

  const setDevLicenseCredentials = ({
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

export const useDevCredentials = () => {
  const context = useContext(DevCredentialsContext);
  if (!context) {
    throw new Error(
      "useDevCredentials must be used within a DevCredentialsProvider"
    );
  }
  return context;
};
