import { CloudEventAgreement } from '../types';
import { DOCUMENT_EVENT_TYPE_LABELS } from '../enums/documentEventTypes';
import { fetchWithTimeout } from '../utils/withTimeout';

// Same gateway dimo-app-backend reads SACD sources from.
const IPFS_GATEWAY = 'https://assets.dimo.org/ipfs';
const SOURCE_FETCH_TIMEOUT_MS = 10_000;

// The transactions SDK's default when an agreement has no eventType (it uses
// `||`, so an empty string also gets the default).
const DEFAULT_EVENT_TYPE = 'dimo.attestation';
const eventTypeOf = (agreement: CloudEventAgreement) =>
  agreement.eventType || DEFAULT_EVENT_TYPE;

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
  DOCUMENT_EVENT_TYPE_LABELS[eventTypeOf(agreement)] ?? eventTypeOf(agreement);

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

// An existing agreement covers a requested one when it's for the same event
// type and source, and grants all events (no ids) or every requested id.
const covers = (existing: CloudEventAgreement, wanted: CloudEventAgreement) =>
  eventTypeOf(existing) === eventTypeOf(wanted) &&
  sameSource(existing.source, wanted.source) &&
  (!existing.ids?.length || (wanted.ids ?? []).every((id) => existing.ids!.includes(id)));

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

export class GrantUnreadableError extends Error {
  constructor(vehicle: { make?: string; model?: string; tokenId: number }) {
    const name = vehicle.make
      ? `${vehicle.make} ${vehicle.model}`
      : `vehicle ${vehicle.tokenId}`;
    super(`Couldn't read the current sharing terms for ${name}. Try again.`);
    this.name = 'GrantUnreadableError';
  }
}

/**
 * The file agreements the vehicle's current grant gives this app. Throws
 * GrantUnreadableError when the grant's document can't be read, so callers
 * that rewrite the grant stop rather than drop access they couldn't see.
 */
export const readGrantAgreements = async (vehicle: {
  tokenId: number;
  tokenDID: string;
  source?: string;
  make?: string;
  model?: string;
}): Promise<CloudEventAgreement[]> => {
  const { source } = vehicle;
  // A grant signed without a source document has no agreements at all.
  if (!source) return [];
  if (!source.startsWith('ipfs://')) throw new GrantUnreadableError(vehicle);
  try {
    const cid = source.slice('ipfs://'.length);
    const res = await fetchWithTimeout(
      `${IPFS_GATEWAY}/${cid}`,
      {},
      SOURCE_FETCH_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`gateway returned ${res.status}`);
    return getVehicleAgreements(await res.json(), vehicle.tokenDID);
  } catch (error) {
    console.error('Error reading SACD source:', error);
    throw new GrantUnreadableError(vehicle);
  }
};

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
