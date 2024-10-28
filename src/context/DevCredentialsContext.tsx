/**
 * DevCredentialsContext.tsx
 * 
 * This file provides the DevCredentialsContext and DevCredentialsProvider, which manage global 
 * state for developer credentials (clientId, apiKey, redirectUri) in the application. These credentials 
 * are typically provided by the developer when using the SDK
 * 
 */

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";

interface DevCredentialsContextProps {
  clientId?: string;
  apiKey?: string;
  redirectUri?: string;
  setCredentials: (credentials: { clientId: string; apiKey: string; redirectUri: string }) => void;
  credentialsLoading: boolean; // Renamed to avoid conflict with AuthContext
}

const DevCredentialsContext = createContext<DevCredentialsContextProps | undefined>(undefined);

// Provider component for Dev Credentials
export const DevCredentialsProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [clientId, setClientId] = useState<string | undefined>();
  const [apiKey, setApiKey] = useState<string | undefined>();
  const [redirectUri, setRedirectUri] = useState<string | undefined>();
  const [credentialsLoading, setCredentialsLoading] = useState<boolean>(true); // Renamed loading state

  // Example of using postMessage to receive credentials (as described previously)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { eventType, clientId, apiKey, redirectUri } = event.data;
      if (eventType === "AUTH_INIT") {
        setClientId(clientId);
        setApiKey(apiKey);
        setRedirectUri(redirectUri);
        setCredentialsLoading(false); // Credentials loaded
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const setCredentials = ({ clientId, apiKey, redirectUri }: { clientId: string; apiKey: string; redirectUri: string }) => {
    setClientId(clientId);
    setApiKey(apiKey);
    setRedirectUri(redirectUri);
    setCredentialsLoading(false);
  };

  return (
    <DevCredentialsContext.Provider value={{ clientId, apiKey, redirectUri, setCredentials, credentialsLoading }}>
      {children}
    </DevCredentialsContext.Provider>
  );
};

// Hook to use the DevCredentialsContext
export const useDevCredentials = () => {
  const context = useContext(DevCredentialsContext);
  if (!context) {
    throw new Error("useDevCredentials must be used within a DevCredentialsProvider");
  }
  return context;
};
