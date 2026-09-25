import { useState } from 'react';

import {
  AllParams,
  CloudEventAgreement,
  SignMessageData,
  TransactionParams,
} from '../types';
import { useUIManager } from '../context/UIManagerContext';
import { useOracles } from '../context/OraclesContext';
import { UiStates } from '../enums';
import { setForceEmail } from '../stores/AuthStateStore';
import { parseExpirationDate, getDefaultExpirationDate } from '../utils/dateUtils';
import { toCloudEventAgreements } from '../services/vehicleDocumentAgreements';
import { DOCUMENT_EVENT_TYPES } from '../enums/documentEventTypes';

// cloudEvent arrives as an object (postMessage, OAuth state), as JSON encoded
// once more by the SDK (redirect), or as plain JSON in a hand-built link.
// A malformed value is dropped rather than crashing the page.
const parseCloudEvent = (
  value: unknown,
): CloudEventAgreement | CloudEventAgreement[] | undefined => {
  if (typeof value !== 'string') {
    return value as CloudEventAgreement | CloudEventAgreement[] | undefined;
  }
  for (const decode of [(v: string) => decodeURIComponent(v), (v: string) => v]) {
    try {
      return JSON.parse(decode(value));
    } catch {
      // try the next form
    }
  }
  console.error('Ignoring malformed cloudEvent param');
  return undefined;
};

// Only document requests the consent screen can name are signed (see
// toCloudEventAgreements). Say so, so an app doesn't assume it got the rest.
const warnAboutUnsupportedCloudEvents = (cloudEvent: unknown) => {
  const requested = Array.isArray(cloudEvent) ? cloudEvent.length : 1;
  const dropped = requested - toCloudEventAgreements(cloudEvent).length;
  if (dropped > 0) {
    console.warn(
      `Ignoring ${dropped} cloudEvent request(s): only ${Object.values(
        DOCUMENT_EVENT_TYPES,
      ).join(', ')} with valid ids/source are supported.`,
    );
  }
};

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
    messageData: (value: unknown) =>
      setDevCredentialsState((prev) => ({
        ...prev,
        messageData: (typeof value === 'string'
          ? JSON.parse(decodeURIComponent(value))
          : value) as SignMessageData,
      })),
    cloudEvent: (value: unknown) => {
      const cloudEvent = parseCloudEvent(value);
      if (!cloudEvent) return;
      warnAboutUnsupportedCloudEvents(cloudEvent);
      setDevCredentialsState((prev) => ({ ...prev, cloudEvent }));
    },
  };

  const applyDevCredentialsConfig = (config: Record<string, unknown>) => {
    Object.entries(config).forEach(([key, value]) => {
      // An incoming `undefined` means "not provided" by the SDK payload — never
      // write it, or it clobbers the defaults in DEFAULT_CONTEXT. (e.g. a missing
      // expirationDate would overwrite the 100-year default with undefined, which
      // the account SACD builder then feeds to `new Date()` → "Invalid Date".)
      if (value === undefined) return;
      if (
        key in specialSetters &&
        specialSetters[key as keyof typeof specialSetters]
      ) {
        specialSetters[key as keyof typeof specialSetters](value);
      } else {
        // Bail out when the value is unchanged so a re-delivered AUTH_INIT (or a
        // repeated message) doesn't fire a fresh setState per key and trigger a
        // full-tree re-render storm. Returning `prev` lets React skip the update.
        setDevCredentialsState((prev) =>
          (prev as unknown as Record<string, unknown>)[key] === value
            ? prev
            : { ...prev, [key]: value },
        );
      }
    });
  };

  return {
    devCredentialsState,
    applyDevCredentialsConfig,
  };
};
