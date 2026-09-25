import { CloudEventAgreement } from '../types';
import {
  DOCUMENT_EVENT_TYPE_LABELS,
  DOCUMENT_EVENT_TYPES,
} from '../enums/documentEventTypes';
import { fetchWithTimeout } from '../utils/withTimeout';

// Same gateway dimo-app-backend reads SACD sources from.
const IPFS_GATEWAY = 'https://assets.dimo.org/ipfs';
const SOURCE_FETCH_TIMEOUT_MS = 10_000;

// The transactions SDK's default when an agreement has no eventType (it uses
// `||`, so an empty string also gets the default).
const DEFAULT_EVENT_TYPE = 'dimo.attestation';
const eventTypeOf = (agreement: CloudEventAgreement) =>
  agreement.eventType || DEFAULT_EVENT_TYPE;

// undefined when the value isn't a list of strings.
const stringList = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : undefined;

/**
 * The `cloudEvent` param is one agreement or a list of them. A malformed entry
 * is dropped whole rather than repaired: a missing eventType would be signed
 * as every attestation, bad ids as every event, and a bad source as the
 * user's own address, each wider or different from what the app meant.
 * `source` may be omitted: an app can't know the user's address before login,
 * so the signer fills in the grantor (see generateIpfsSources).
 */
export const toCloudEventAgreements = (cloudEvent?: unknown): CloudEventAgreement[] => {
  if (!cloudEvent) return [];
  const list: unknown[] = Array.isArray(cloudEvent) ? cloudEvent : [cloudEvent];
  return list.flatMap((entry) => {
    const agreement = entry as Record<string, unknown> | null;
    if (!agreement || typeof agreement !== 'object') return [];
    const { eventType, source } = agreement;
    // Only the document patterns the consent screen can name. Anything else
    // would be shown to the user as an app-supplied string, if at all.
    if (!isDocumentEventType(eventType)) return [];
    const ids = agreement.ids === undefined ? [] : stringList(agreement.ids);
    if (!ids) return [];
    const validSource = typeof source === 'string' && /^0x[0-9a-fA-F]{40}$/.test(source);
    if (source !== undefined && !validSource) return [];
    return [
      {
        eventType,
        ...(validSource && { source: source as `0x${string}` }),
        ids,
        tags: stringList(agreement.tags) ?? [],
      },
    ];
  });
};

const DOCUMENT_EVENT_TYPE_VALUES: readonly string[] = Object.values(DOCUMENT_EVENT_TYPES);
const isDocumentEventType = (value: unknown): value is string =>
  typeof value === 'string' && DOCUMENT_EVENT_TYPE_VALUES.includes(value);

// Labels come only from DIMO's own list, never from app-supplied text.
export const getAgreementLabel = (agreement: CloudEventAgreement): string =>
  DOCUMENT_EVENT_TYPE_LABELS[eventTypeOf(agreement)] ?? 'Other files';

export const getFileLabels = (agreements: CloudEventAgreement[]): string[] =>
  Array.from(new Set(agreements.map(getAgreementLabel)));

/** Labels for the requested files, if any of these vehicles' grants lack them. */
export const getMissingFileLabels = (
  vehicles: { documentAccess?: boolean }[],
  requested: CloudEventAgreement[],
): string[] =>
  vehicles.some((v) => v.documentAccess === false) ? getFileLabels(requested) : [];

/**
 * The SACD asset for a vehicle grant. File agreements only count for the DID
 * they name, so refuse to sign them against the 'did:' placeholder.
 */
export const getVehicleAsset = (
  vehicle: { tokenId: number; tokenDID?: string },
  withFiles: boolean,
): `did:${string}` | undefined => {
  if (vehicle.tokenDID) return vehicle.tokenDID as `did:${string}`;
  if (withFiles) {
    throw new Error(`Vehicle ${vehicle.tokenId} has no DID; can't grant file access`);
  }
  return undefined;
};

type SacdDocumentAgreement = CloudEventAgreement & { type?: string; asset?: string };

/** The cloudevent agreements a signed SACD document grants on this vehicle. */
export const getVehicleAgreements = (
  document: unknown,
  vehicleDID: string,
): CloudEventAgreement[] => {
  const agreements = (document as { data?: { agreements?: unknown } })?.data?.agreements;
  if (!Array.isArray(agreements)) return [];
  const asset = vehicleDID.toLowerCase();
  return (agreements as SacdDocumentAgreement[])
    .filter((a) => a.type === 'cloudevent' && a.asset?.toLowerCase() === asset)
    .map(({ eventType, source, ids, tags }) => ({
      eventType,
      source,
      ids: ids ?? [],
      tags: tags ?? [],
    }));
};

const sameSource = (a?: string, b?: string) =>
  !a || !b || a.toLowerCase() === b.toLowerCase();

// Empty ids means every event of the type. An existing agreement covers a
// requested one when it's for the same event type and source, and its ids
// include the requested ones (all events covers anything; specific ids never
// cover a request for all events).
const coversIds = (existing: string[] = [], wanted: string[] = []) =>
  !existing.length || (wanted.length > 0 && wanted.every((id) => existing.includes(id)));

const covers = (existing: CloudEventAgreement, wanted: CloudEventAgreement) =>
  eventTypeOf(existing) === eventTypeOf(wanted) &&
  sameSource(existing.source, wanted.source) &&
  coversIds(existing.ids, wanted.ids);

export const coversAll = (
  existing: CloudEventAgreement[],
  requested: CloudEventAgreement[],
): boolean => requested.every((wanted) => existing.some((e) => covers(e, wanted)));

/** Existing agreements plus any requested ones they don't already cover. */
export const mergeAgreements = (
  existing: CloudEventAgreement[],
  requested: CloudEventAgreement[],
): CloudEventAgreement[] => [
  ...existing,
  ...requested.filter((wanted) => !existing.some((e) => covers(e, wanted))),
];

/** Requested agreements with the grantor filled in, as they'll be signed. */
export const withSource = (
  agreements: CloudEventAgreement[],
  grantor?: string | null,
): CloudEventAgreement[] =>
  agreements.map((a) => ({
    ...a,
    source: (a.source || grantor || undefined) as `0x${string}` | undefined,
  }));

type VehicleLabel = { make?: string; model?: string; tokenId: number };
const vehicleName = (vehicle: VehicleLabel) =>
  vehicle.make ? `${vehicle.make} ${vehicle.model}` : `vehicle ${vehicle.tokenId}`;

/**
 * Raised instead of rewriting a grant whose current terms can't be carried
 * over in full, so an update never drops access nobody could see.
 */
export class GrantUnreadableError extends Error {
  constructor(vehicle: VehicleLabel, reason = 'Try again.') {
    super(
      `Couldn't read the current sharing terms for ${vehicleName(vehicle)}. ${reason}`,
    );
    this.name = 'GrantUnreadableError';
  }
}

// ipfs:// documents are content-addressed, so a read can be reused for the
// session; https:// ones can change and are read fresh. Failures aren't
// cached, so the next attempt retries.
const grantReads = new Map<string, Promise<CloudEventAgreement[]>>();

const sourceUrl = (source: string) => {
  if (source.startsWith('ipfs://'))
    return `${IPFS_GATEWAY}/${source.slice('ipfs://'.length)}`;
  if (source.startsWith('https://')) return source;
  return undefined;
};

const LEGACY_GRANT_TYPE = 'org.dimo.permission.grant.v1';

// Identified by its declared type only; any other shape without agreements
// still fails closed as unreadable.
const isLegacyGrantDocument = (document: unknown): boolean => {
  const doc = document as { type?: unknown; data?: { agreements?: unknown } } | null;
  return doc?.type === LEGACY_GRANT_TYPE && !Array.isArray(doc?.data?.agreements);
};

/**
 * The file agreements the vehicle's current grant gives this app. Throws
 * GrantUnreadableError when the grant's document can't be read, so callers
 * that rewrite the grant stop rather than drop access they couldn't see.
 */
export const readGrantAgreements = (vehicle: {
  tokenId: number;
  tokenDID: string;
  source?: string;
  make?: string;
  model?: string;
}): Promise<CloudEventAgreement[]> => {
  const { source } = vehicle;
  // A grant signed without a source document has no agreements at all.
  if (!source) return Promise.resolve([]);
  const url = sourceUrl(source);
  if (!url) {
    return Promise.reject(
      new GrantUnreadableError(
        vehicle,
        "Its terms are stored somewhere DIMO can't read.",
      ),
    );
  }
  const cacheable = source.startsWith('ipfs://');
  const key = `${source}|${vehicle.tokenDID.toLowerCase()}`;
  const cached = cacheable ? grantReads.get(key) : undefined;
  if (cached) return cached;

  const read = (async () => {
    try {
      const res = await fetchWithTimeout(url, {}, SOURCE_FETCH_TIMEOUT_MS);
      if (!res.ok) throw new Error(`gateway returned ${res.status}`);
      const document = await res.json();
      // Grants signed before the SACD format (roughly until 2025-09) use the
      // legacy permission-grant document, which can't carry file agreements.
      if (isLegacyGrantDocument(document)) return [];
      // Any other unfamiliar shape isn't "no files"; treating it so would let
      // an update drop agreements it couldn't see.
      if (!Array.isArray(document?.data?.agreements)) {
        throw new Error('unexpected SACD document shape');
      }
      return getVehicleAgreements(document, vehicle.tokenDID);
    } catch (error) {
      console.error('Error reading SACD source:', error);
      grantReads.delete(key);
      throw new GrantUnreadableError(vehicle);
    }
  })();
  if (cacheable) grantReads.set(key, read);
  return read;
};

/** Test hook: forget cached grant reads. */
export const clearGrantReadCache = () => grantReads.clear();

/**
 * Whether the vehicle's current grant already includes the requested file
 * agreements. Returns undefined when that can't be determined so callers
 * don't prompt on a guess.
 */
export const checkDocumentAccess = async (
  vehicle: { tokenId: number; tokenDID: string; source?: string },
  requested: CloudEventAgreement[],
  grantor?: string | null,
): Promise<boolean | undefined> => {
  if (!requested.length) return undefined;
  try {
    const existing = await readGrantAgreements(vehicle);
    return coversAll(existing, withSource(requested, grantor));
  } catch {
    return undefined;
  }
};
