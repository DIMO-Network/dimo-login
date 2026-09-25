import { CloudEventAgreement } from '../types';
import { fetchWithTimeout } from '../utils/withTimeout';

// Same gateway dimo-app-backend reads SACD sources from.
const IPFS_GATEWAY = 'https://assets.dimo.org/ipfs';
const SOURCE_FETCH_TIMEOUT_MS = 10_000;

// The SDK's default when an agreement has no eventType.
const DEFAULT_EVENT_TYPE = 'dimo.attestation';

// Plain names for the "Files Requested" line, keyed by cloudevent pattern.
const EVENT_TYPE_LABELS: Record<string, string> = {
  'dimo.document.vehicle.*': 'Vehicle documents',
  'dimo.document.driver.*': 'Driver documents',
  'dimo.raw.vehicle.*': 'Original vehicle document files',
  'dimo.raw.driver.*': 'Original driver document files',
};

/**
 * The `cloudEvent` param is one agreement or a list of them. `source` may be
 * omitted: an app can't know the user's address before login, so the signer
 * fills in the grantor (see generateIpfsSources).
 */
export const toCloudEventAgreements = (
  cloudEvent?: CloudEventAgreement | CloudEventAgreement[],
): CloudEventAgreement[] => {
  if (!cloudEvent) return [];
  const list = Array.isArray(cloudEvent) ? cloudEvent : [cloudEvent];
  return list.map((agreement) => ({
    ...agreement,
    ids: agreement.ids ?? [],
    tags: agreement.tags ?? [],
  }));
};

export const getAgreementLabel = (agreement: CloudEventAgreement): string =>
  EVENT_TYPE_LABELS[agreement.eventType ?? ''] ??
  agreement.eventType ??
  DEFAULT_EVENT_TYPE;

/** Labels for the requested files, if any of these vehicles' grants lack them. */
export const getMissingFileLabels = (
  vehicles: { documentAccess?: boolean }[],
  requested: CloudEventAgreement[],
): string[] =>
  vehicles.some((v) => v.documentAccess === false)
    ? Array.from(new Set(requested.map(getAgreementLabel)))
    : [];

type SacdDocumentAgreement = { type?: string; eventType?: string; asset?: string };

/**
 * True when a signed SACD document already carries every requested cloudevent
 * agreement for this vehicle. Mirrors dimo-app-backend's hasDocumentAgreement:
 * the agreement's asset must be this vehicle's DID (case-insensitive).
 */
export const hasRequestedAgreements = (
  document: unknown,
  vehicleDID: string,
  requested: CloudEventAgreement[],
): boolean => {
  const agreements = (document as { data?: { agreements?: unknown } })?.data?.agreements;
  if (!Array.isArray(agreements)) return false;
  const asset = vehicleDID.toLowerCase();
  return requested.every((want) =>
    (agreements as SacdDocumentAgreement[]).some(
      (a) =>
        a.type === 'cloudevent' &&
        a.eventType === (want.eventType ?? DEFAULT_EVENT_TYPE) &&
        a.asset?.toLowerCase() === asset,
    ),
  );
};

/**
 * Whether the vehicle's current grant already includes the requested file
 * agreements. Returns undefined when that can't be determined (no source, or
 * the gateway is unreachable) so callers don't prompt on a guess.
 */
export const checkDocumentAccess = async (
  vehicle: { tokenDID: string; source?: string },
  requested: CloudEventAgreement[],
): Promise<boolean | undefined> => {
  if (!requested.length) return undefined;
  const { source } = vehicle;
  // A grant signed without a source document has no agreements at all.
  if (!source) return false;
  if (!source.startsWith('ipfs://')) return undefined;
  try {
    const cid = source.slice('ipfs://'.length);
    const res = await fetchWithTimeout(
      `${IPFS_GATEWAY}/${cid}`,
      {},
      SOURCE_FETCH_TIMEOUT_MS,
    );
    if (!res.ok) return undefined;
    return hasRequestedAgreements(await res.json(), vehicle.tokenDID, requested);
  } catch (error) {
    console.error('Error reading SACD source:', error);
    return undefined;
  }
};
