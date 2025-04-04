import React, { createContext, ReactNode, useContext, useState } from 'react';

interface GlobalOraclesContextProps {
  onboardingEnabled: boolean;
  setOnboardingEnabled: (enabled: boolean) => void;
}

const GlobalOraclesContext = createContext<GlobalOraclesContextProps | undefined>(
  undefined,
);

export const GlobalOraclesProvider = ({ children }: { children: ReactNode }) => {
  const [onboardingEnabled, setOnboardingEnabled] = useState<boolean>(false);

  return (
    <GlobalOraclesContext.Provider value={{ onboardingEnabled, setOnboardingEnabled }}>
      {children}
    </GlobalOraclesContext.Provider>
  );
};

export const useOracles = () => {
  const context = useContext(GlobalOraclesContext);
  if (!context) {
    throw new Error('useOracles must be used within a GlobalOraclesProvider');
  }
  return context;
};
