import React, { createContext, ReactNode, useContext, useState } from "react";

interface UIManagerContextProps {
  uiState: string;
  setUiState: React.Dispatch<React.SetStateAction<string>>;
  entryState: string;
  setEntryState: React.Dispatch<React.SetStateAction<string>>;
  componentData: any;
  setComponentData: React.Dispatch<React.SetStateAction<any>>;
  isLoading: boolean;
  loadingMessage: string;
  setLoadingState: (loading: boolean, message?: string) => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;  
}

const UIManagerContext = createContext<UIManagerContextProps | undefined>(
  undefined
);

export const UIManagerProvider = ({ children }: { children: ReactNode }) => {
  const [uiState, setUiState] = useState("OTP_INPUT"); // Initial UI state
  const [entryState, setEntryState] = useState("EMAIL_INPUT");
  const [componentData, setComponentData] = useState<any | null>(null); // Initial component data
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>("");

  const setLoadingState = (loading: boolean, message: string = "") => {
    setIsLoading(loading);
    setLoadingMessage(loading ? message : ""); // Clear the message if not loading
  };

  return (
    <UIManagerContext.Provider
      value={{
        uiState,
        entryState,
        setEntryState,
        setUiState,
        componentData,
        setComponentData,
        isLoading,
        loadingMessage,
        setLoadingState,
        error,
        setError,
      }}
    >
      {children}
    </UIManagerContext.Provider>
  );
};

export const useUIManager = () => {
  const context = useContext(UIManagerContext);
  if (!context) {
    throw new Error("useUIManager must be used within a UIManagerProvider");
  }
  return context;
};
