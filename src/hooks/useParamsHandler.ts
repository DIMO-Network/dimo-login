import { useState } from 'react';

import { AllParams, CloudEventAgreement, TransactionParams } from '../types';
import { useUIManager } from '../context/UIManagerContext';
import { useOracles } from '../context/OraclesContext';
import { UiStates } from '../enums';
import { setForceEmail } from '../stores/AuthStateStore';
import { parseExpirationDate, getDefaultExpirationDate } from '../utils/dateUtils';

export const useParamsHandler = (DEFAULT_CONTEXT: AllParams) => {
  const [devCredentialsState, setDevCredentialsState] =
    useState<AllParams>(DEFAULT_CONTEXT);
  const { setUiState, setEntryState, setAltTitle } = useUIManager();
  const { setOnboardingEnabled } = useOracles();

  const specialSetters = {
    entryState: (value: unknown) => {
      if (typeof value !== 'string' || !(value in UiStates)) return;
      setUiState(value as UiStates);
      setEntryState(value as UiStates);
      setDevCredentialsState((prev) => ({
        ...prev,
        entryState: value as UiStates,
      }));
    },
    forceEmail: (value: unknown) => {
      setForceEmail(Boolean(value));
      setDevCredentialsState((prev) => ({
        ...prev,
        forceEmail: Boolean(value),
      }));
    },
    altTitle: (value: unknown) => {
      setAltTitle(Boolean(value));
      setDevCredentialsState((prev) => ({
        ...prev,
        altTitle: Boolean(value),
      }));
    },
    vehicles: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        vehicleTokenIds: Array.isArray(value) ? value : [value],
      })),
    vehicleMakes: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        vehicleMakes: Array.isArray(value) ? value : [value],
      })),
    powertrainTypes: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        powertrainTypes: Array.isArray(value) ? value : [value],
      })),
    expirationDate: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        expirationDate: value
          ? parseExpirationDate(String(value))
          : getDefaultExpirationDate(),
      })),
    region: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        region: String(value).toUpperCase(),
      })),
    onboarding: (value: unknown) => setOnboardingEnabled(Boolean(String(value).length)),
    transactionData: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        transactionData: (typeof value === 'string'
          ? JSON.parse(decodeURIComponent(value))
          : value) as TransactionParams,
      })),
    cloudEvent: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        attestation: (typeof value === 'string' ? JSON.parse(decodeURIComponent(value)) : value) as CloudEventAgreement,
      }))
  };

  const applyDevCredentialsConfig = (config: Record<string, unknown>) => {
    Object.entries(config).forEach(([key, value]) => {
      if (
        key in specialSetters &&
        specialSetters[key as keyof typeof specialSetters] &&
        value !== undefined
      ) {
        specialSetters[key as keyof typeof specialSetters](value);
      } else {
        setDevCredentialsState((prev) => ({
          ...prev,
          [key]: value,
        }));
      }
    });
  };

  return {
    devCredentialsState,
    applyDevCredentialsConfig,
  };
};
