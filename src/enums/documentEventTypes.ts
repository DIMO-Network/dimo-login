// Cloudevent patterns for documents, shared by the vehicle and account flows.
// Same values as dimo-app-backend's DOC_EVENT_TYPE_PATTERNS and the SDK's
// DocumentAccess enum. The trailing `*` is a prefix match.
export const DOCUMENT_EVENT_TYPES = {
  vehicleDocuments: 'dimo.document.vehicle.*',
  driverDocuments: 'dimo.document.driver.*',
  rawVehicleDocuments: 'dimo.raw.vehicle.*',
  rawDriverDocuments: 'dimo.raw.driver.*',
} as const;

// Plain names for the consent screen, keyed by pattern.
export const DOCUMENT_EVENT_TYPE_LABELS: Record<string, string> = {
  [DOCUMENT_EVENT_TYPES.vehicleDocuments]: 'Vehicle documents',
  [DOCUMENT_EVENT_TYPES.driverDocuments]: 'Driver documents',
  [DOCUMENT_EVENT_TYPES.rawVehicleDocuments]: 'Original vehicle document files',
  [DOCUMENT_EVENT_TYPES.rawDriverDocuments]: 'Original driver document files',
};
