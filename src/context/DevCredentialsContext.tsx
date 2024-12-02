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

interface DevCredentialsContextProps {
  clientId?: string;
  apiKey?: string;
  redirectUri?: string;
  credentialsLoading: boolean; // Renamed to avoid conflict with AuthContext
  invalidCredentials: boolean;
  uiState: string;
  setUiState: React.Dispatch<React.SetStateAction<string>>;
  componentData: any;
  setComponentData: React.Dispatch<React.SetStateAction<any>>;
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
  const [uiState, setUiState] = useState("EMAIL_INPUT"); //TODO: should be enum
  const [componentData, setComponentData] = useState<any | null>(null);

  // Example of using postMessage to receive credentials (as described previously)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const clientIdFromUrl = urlParams.get("clientId");
    const redirectUriFromUrl = urlParams.get("redirectUri");
    const entryStateFromUrl = urlParams.get("entryState");

    if (clientIdFromUrl && redirectUriFromUrl) {
      setClientId(clientIdFromUrl);
      setRedirectUri(redirectUriFromUrl);
      setApiKey("api key"); //not needed for redirect url

      setUiState(entryStateFromUrl || "EMAIL_INPUT");

      setCredentialsLoading(false); // Credentials loaded
    } else {
      const handleMessage = (event: MessageEvent) => {
        const {
          eventType,
          clientId,
          apiKey,
          redirectUri,
          entryState,
        } = event.data;
        if (eventType === "AUTH_INIT") {
          setClientId(clientId);
          setApiKey(apiKey || "api key"); //todo, bring back when api key is needed
          setRedirectUri(redirectUri);
          setUiState(entryState || "EMAIL_INPUT");
          setCredentialsLoading(false); // Credentials loaded
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
        const isValid = await isValidClientId(clientId, redirectUri);
        if (isValid) {
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
        uiState,
        setUiState,
        componentData,
        setComponentData
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
