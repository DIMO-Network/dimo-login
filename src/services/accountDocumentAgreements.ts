import { CloudEventAgreement } from '../types';
import { DOCUMENT_EVENT_TYPES } from '../enums/documentEventTypes';

// Cloudevent patterns granted by an account-level SACD for personal documents.
// Restricted to driver document + raw driver payloads (license, insurance, …).
const DRIVER_DOC_PATTERNS = [
  DOCUMENT_EVENT_TYPES.driverDocuments,
  DOCUMENT_EVENT_TYPES.rawDriverDocuments,
] as const;

// Builds the cloudevent agreements attached to an account SACD source document.
// `source` is the grantor's smart-contract address; an empty `ids` array means
// "all events of this type" and `documents` tags the grant for the docs surface.
export const buildDriverDocAgreements = (
  grantor: `0x${string}`,
): (CloudEventAgreement & { source: `0x${string}` })[] =>
  DRIVER_DOC_PATTERNS.map((eventType) => ({
    eventType,
    source: grantor,
    ids: [],
    tags: ['documents'],
  }));
