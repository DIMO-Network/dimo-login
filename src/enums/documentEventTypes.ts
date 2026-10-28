import type { TranslationKey } from '../i18n/types';

// Cloudevent patterns for documents, shared by the vehicle and account flows.
// Same values as dimo-app-backend's DOC_EVENT_TYPE_PATTERNS and the SDK's
// DocumentAccess enum. The trailing `*` is a prefix match.
export const DOCUMENT_EVENT_TYPES = {
  vehicleDocuments: 'dimo.document.vehicle.*',
  driverDocuments: 'dimo.document.driver.*',
  rawVehicleDocuments: 'dimo.raw.vehicle.*',
  rawDriverDocuments: 'dimo.raw.driver.*',
} as const;

// Plain names for the consent screen, keyed by pattern (see i18n/locales).
export const DOCUMENT_EVENT_TYPE_LABEL_KEYS = {
  [DOCUMENT_EVENT_TYPES.vehicleDocuments]: 'document.vehicle',
  [DOCUMENT_EVENT_TYPES.driverDocuments]: 'document.driver',
  [DOCUMENT_EVENT_TYPES.rawVehicleDocuments]: 'document.raw_vehicle',
  [DOCUMENT_EVENT_TYPES.rawDriverDocuments]: 'document.raw_driver',
} as const satisfies Record<string, TranslationKey>;
