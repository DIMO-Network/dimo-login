import { CloudEventAgreement } from '../types';

// Cloudevent patterns granted by an account-level SACD for personal documents.
// Restricted to driver document + raw driver payloads (license, insurance, …).
const DRIVER_DOC_PATTERNS = ['dimo.document.driver.*', 'dimo.raw.driver.*'] as const;

// Builds the cloudevent agreements attached to an account SACD source document.
// `source` is the grantor's smart-contract address; an empty `ids` array means
// "all events of this type" and `documents` tags the grant for the docs surface.
export const buildDriverDocAgreements = (
  grantor: `0x${string}`,
): CloudEventAgreement[] =>
  DRIVER_DOC_PATTERNS.map((eventType) => ({
    eventType,
    source: grantor,
    ids: [],
    tags: ['documents'],
  }));
