import React, { createContext, ReactNode, useContext, useState } from 'react';

import { UiStates } from '../enums';

import useLoading from '../hooks/useLoading';

interface UiStateOptionProps {
  setBack: boolean;
  removeCurrent?: boolean;
}

interface UIManagerContextProps {
  uiState: UiStates;
  setUiState: (state: UiStates, options?: UiStateOptionProps) => void;
  prevUiStates: UiStates[];
  goBack: () => void;
  entryState: string;
  setEntryState: (entryState: UiStates) => void;
  componentData: any;
  setComponentData: React.Dispatch<React.SetStateAction<any>>;
  isLoading: boolean;
  loadingMessage: string;
  setLoadingState: (loading: boolean, message?: string, isLongProcess?: boolean) => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  altTitle: boolean;
  setAltTitle: React.Dispatch<React.SetStateAction<boolean>>;
}

const UIManagerContext = createContext<UIManagerContextProps | undefined>(undefined);

export const UIManagerProvider = ({ children }: { children: ReactNode }) => {
  const [uiState, setUiState] = useState<UiStates>(UiStates.EMAIL_INPUT); // Initial UI state
  const [prevUiStates, setPrevUiStates] = useState<UiStates[]>([]);
  const [entryState, setEntryState] = useState<UiStates>(UiStates.EMAIL_INPUT);
  const [componentData, setComponentData] = useState<any | null>(null); // Initial component data
  const [isLoading, setLoadingState, loadingMessage] = useLoading(false);
  const [error, setError] = useState<string | null>(null);
  const [altTitle, setAltTitle] = useState<boolean>(false);

  const handleUiState = (
    value: UiStates,
    options: UiStateOptionProps = { setBack: false },
  ) => {
    const { setBack, removeCurrent } = options;
    const defaultValue = [value];
    if (setBack) {
      let newPrevUiStates: UiStates[] = [...prevUiStates];
      if (removeCurrent) {
        newPrevUiStates = prevUiStates.filter((state) => state !== uiState);
      }

      setPrevUiStates([...newPrevUiStates, value]);
    } else {
      setPrevUiStates(defaultValue);
    }
    setUiState(value);
  };

  const handleGoBack = () => {
    if (prevUiStates.length > 0) {
      const newPrevUiStates = prevUiStates.filter((state) => state !== uiState);
      const prevUiState = newPrevUiStates[newPrevUiStates.length - 1];
      setUiState(prevUiState!);
      setPrevUiStates(newPrevUiStates);
    }
  };

  return (
    <UIManagerContext.Provider
      value={{
        uiState,
        prevUiStates,
        goBack: handleGoBack,
        entryState,
        setEntryState,
        setUiState: handleUiState,
        componentData,
        setComponentData,
        isLoading,
        loadingMessage,
        setLoadingState,
        error,
        setError,
        altTitle,
        setAltTitle,
      }}
    >
      {children}
    </UIManagerContext.Provider>
  );
};

export const useUIManager = () => {
  const context = useContext(UIManagerContext);
  if (!context) {
    throw new Error('useUIManager must be used within a UIManagerProvider');
  }
  return context;
};
