/**
 * DevCredentialsContext.tsx
 *
 * This file provides the DevCredentialsContext and DevCredentialsProvider, which manage global
 * state for developer credentials (clientId, apiKey, redirectUri) in the application. These credentials
 * are typically provided by the developer when using the SDK
 *
 */

import { UUID } from "crypto";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { isValidClientId } from "../services/identityService";
import { createKernelSigner } from "../services/turnkeyService";
import { TransactionData } from "@dimo-network/transactions";
import { useUIManager } from "./UIManagerContext";

interface DevCredentialsContextProps {
  clientId?: string;
  apiKey?: string;
  redirectUri?: string;
  credentialsLoading: boolean; // Renamed to avoid conflict with AuthContext
  invalidCredentials: boolean;
  devLicenseAlias: string | null | undefined;
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
  const [clientId, setClientId] = useState<string | undefined>();
  const [apiKey, setApiKey] = useState<string | undefined>();
  const [redirectUri, setRedirectUri] = useState<string | undefined>();
  const [credentialsLoading, setCredentialsLoading] = useState<boolean>(true); // Renamed loading state
  const [invalidCredentials, setInvalidCredentials] = useState<boolean>(false);
  const [devLicenseAlias, setDevLicenseAlias] = useState<string | null>(); // Alias will only be set if credentials are valid, defaults to client ID if not alias
  const { setUiState, setEntryState } = useUIManager();

  // Example of using postMessage to receive credentials (as described previously)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const clientIdFromUrl = urlParams.get("clientId");
    const redirectUriFromUrl = urlParams.get("redirectUri");
    const entryStateFromUrl = urlParams.get("entryState");

    if (clientIdFromUrl && redirectUriFromUrl) {
      setUiState(entryStateFromUrl || "EMAIL_INPUT");
      setEntryState(entryStateFromUrl || "EMAIL_INPUT");
      setCredentials({ clientId: clientIdFromUrl, apiKey:"api key", redirectUri: redirectUriFromUrl });
    } else {
      const handleMessage = (event: MessageEvent) => {
        const { eventType, clientId, apiKey, redirectUri, entryState } =
          event.data;
        if (eventType === "AUTH_INIT") {
          setUiState(entryState || "EMAIL_INPUT");
          setEntryState(entryState || "EMAIL_INPUT");
          setCredentials({ clientId, apiKey, redirectUri });
        }
      };
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
          setCredentialsLoading(false); // Credentials loaded
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
  }: {
    clientId: string;
    apiKey: string;
    redirectUri: string;
  }) => {
    setClientId(clientId);
    setApiKey(apiKey);
    setRedirectUri(redirectUri);
    setCredentialsLoading(false);
  };

  return (
    <DevCredentialsContext.Provider
      value={{
        clientId,
        apiKey,
        redirectUri,
        credentialsLoading,
        invalidCredentials,
        devLicenseAlias,
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
