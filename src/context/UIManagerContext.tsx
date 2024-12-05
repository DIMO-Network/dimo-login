import React, { createContext, ReactNode, useContext, useState } from "react";

interface UIManagerContextProps {
  uiState: string;
  setUiState: React.Dispatch<React.SetStateAction<string>>;
  componentData: any;
  setComponentData: React.Dispatch<React.SetStateAction<any>>;
}

const UIManagerContext = createContext<UIManagerContextProps | undefined>(undefined);

export const UIManagerProvider = ({ children }: { children: ReactNode }) => {
  const [uiState, setUiState] = useState("EMAIL_INPUT"); // Initial UI state
  const [componentData, setComponentData] = useState<any | null>(null); // Initial component data

  return (
    <UIManagerContext.Provider value={{ uiState, setUiState, componentData, setComponentData }}>
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
