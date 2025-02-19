import React from 'react';

export interface UiStateOptionProps {
  setBack: boolean;
  removeCurrent?: boolean;
}

export interface UIManagerContextProps {
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
  setLoadingState: (
    loading: boolean,
    message?: string,
    isLongProcess?: boolean
  ) => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export enum UiStates {
  EMAIL_INPUT = 'EMAIL_INPUT',
  OTP_INPUT = 'OTP_INPUT',
  PASSKEY_GENERATOR = 'PASSKEY_GENERATOR',
  VEHICLE_MANAGER = 'VEHICLE_MANAGER',
  SELECT_VEHICLES = 'SELECT_VEHICLES',
  MANAGE_VEHICLE = 'MANAGE_VEHICLE',
  ADVANCED_TRANSACTION = 'ADVANCED_TRANSACTION',
  TRANSACTION_SUCCESS = 'TRANSACTION_SUCCESS',
  TRANSACTION_CANCELLED = 'TRANSACTION_CANCELLED',
  VEHICLES_SHARED_SUCCESS = 'VEHICLES_SHARED_SUCCESS',
  SUCCESS = 'SUCCESS',
}
