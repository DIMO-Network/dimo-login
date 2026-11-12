/**
 * grantsService.ts
 *
 * The connected-apps page's reads from identity-api: every grant an account
 * has made (on its vehicles and on itself) and the license names of the apps
 * they go to. Apart from identityService, which the first screen loads, so
 * this stays in the page's own chunk.
 */
import { queryIdentity } from './identityGraphql';

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/** One SACD grant, as identity-api lists it. */
export type SacdGrant = {
  grantee: string;
  permissions: string;
  expiresAt: string;
  source: string;
};

/** A vehicle the account owns, with every grant on it. */
export type OwnedVehicleGrants = {
  tokenId: number;
  tokenDID: string;
  /** "2021 Tesla Model 3", for display. */
  name: string;
  grants: SacdGrant[];
};

export type ConnectedAppGrants = {
  vehicles: OwnedVehicleGrants[];
  /** Grants on the account itself (its documents). */
  accountGrants: SacdGrant[];
};

type PageInfo = { hasNextPage: boolean; endCursor: string | null };
type GrantPage = { nodes: SacdGrant[]; pageInfo: PageInfo };

// Pages of 50, where the vehicle list asks for 10 grants (GET_VEHICLES), so an
// app past the first ten on a vehicle isn't missed.
const GRANT_PAGE_SIZE = 50;

const GRANT_PAGE_FIELDS = `
  nodes { grantee permissions expiresAt source }
  pageInfo { hasNextPage endCursor }
`;

// The account's vehicles and its own grants, a page of each; either can be
// left out once it has no next page.
const CONNECTED_APP_GRANTS = `
  query ConnectedAppGrants(
    $owner: Address!
    $vehicles: Boolean!
    $vehiclesAfter: String
    $account: Boolean!
    $accountAfter: String
  ) {
    vehicles(filterBy: { owner: $owner }, first: ${GRANT_PAGE_SIZE}, after: $vehiclesAfter)
      @include(if: $vehicles) {
      nodes {
        tokenId
        tokenDID
        definition { make model year }
        sacds(first: ${GRANT_PAGE_SIZE}) { ${GRANT_PAGE_FIELDS} }
      }
      pageInfo { hasNextPage endCursor }
    }
    account(by: { address: $owner }) @include(if: $account) {
      sacds(first: ${GRANT_PAGE_SIZE}, after: $accountAfter) { ${GRANT_PAGE_FIELDS} }
    }
  }
`;

const VEHICLE_GRANTS = `
  query VehicleGrants($tokenId: Int!, $after: String) {
    vehicle(tokenId: $tokenId) {
      sacds(first: ${GRANT_PAGE_SIZE}, after: $after) { ${GRANT_PAGE_FIELDS} }
    }
  }
`;

type ConnectedAppGrantsResult = {
  vehicles?: {
    nodes: {
      tokenId: number;
      tokenDID: string;
      definition?: { make?: string; model?: string; year?: number } | null;
      sacds: GrantPage;
    }[];
    pageInfo: PageInfo;
  };
  account?: { sacds: GrantPage } | null;
};

/** Every answer must be whole: a partial list would hide an app with access. */
const queryWhole = async <T>(query: string, variables: Record<string, unknown>) => {
  const { data, errors } = await queryIdentity<T>(query, variables);
  if (errors.length > 0) throw new Error(errors[0].message);
  if (!data) throw new Error('The identity API returned no grants.');
  return data;
};

const vehicleName = (
  definition?: { make?: string; model?: string; year?: number } | null,
) => [definition?.year, definition?.make, definition?.model].filter(Boolean).join(' ');

const restOfVehicleGrants = async (tokenId: number, after: string | null) => {
  const grants: SacdGrant[] = [];
  let cursor = after;
  while (cursor) {
    const data = await queryWhole<{ vehicle: { sacds: GrantPage } | null }>(
      VEHICLE_GRANTS,
      {
        tokenId,
        after: cursor,
      },
    );
    const page = data.vehicle?.sacds;
    grants.push(...(page?.nodes ?? []));
    cursor = page?.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  }
  return grants;
};

const fetchGrants = async (
  owner: string,
  { vehicles: withVehicles }: { vehicles: boolean },
): Promise<ConnectedAppGrants> => {
  const vehicles: OwnedVehicleGrants[] = [];
  const accountGrants: SacdGrant[] = [];
  const moreGrants: { vehicle: OwnedVehicleGrants; after: string | null }[] = [];
  let vehiclesAfter: string | null = null;
  let accountAfter: string | null = null;
  let wantVehicles = withVehicles;
  let wantAccount = true;

  while (wantVehicles || wantAccount) {
    const data: ConnectedAppGrantsResult = await queryWhole<ConnectedAppGrantsResult>(
      CONNECTED_APP_GRANTS,
      {
        owner,
        vehicles: wantVehicles,
        vehiclesAfter,
        account: wantAccount,
        accountAfter,
      },
    );
    if (wantVehicles) {
      for (const node of data.vehicles?.nodes ?? []) {
        const vehicle: OwnedVehicleGrants = {
          tokenId: node.tokenId,
          tokenDID: node.tokenDID,
          name: vehicleName(node.definition),
          grants: [...node.sacds.nodes],
        };
        vehicles.push(vehicle);
        if (node.sacds.pageInfo.hasNextPage) {
          moreGrants.push({ vehicle, after: node.sacds.pageInfo.endCursor });
        }
      }
      const page = data.vehicles?.pageInfo;
      wantVehicles = Boolean(page?.hasNextPage);
      vehiclesAfter = page?.endCursor ?? null;
    }
    if (wantAccount) {
      const page = data.account?.sacds;
      accountGrants.push(...(page?.nodes ?? []));
      wantAccount = Boolean(page?.pageInfo.hasNextPage);
      accountAfter = page?.pageInfo.endCursor ?? null;
    }
  }

  for (const { vehicle, after } of moreGrants) {
    vehicle.grants.push(...(await restOfVehicleGrants(vehicle.tokenId, after)));
  }
  return { vehicles, accountGrants };
};

/**
 * Every grant the account has made: on each vehicle it owns, and on the
 * account itself. Pages through all of them; any failure throws.
 */
export const fetchConnectedAppGrants = (owner: string): Promise<ConnectedAppGrants> =>
  fetchGrants(owner, { vehicles: true });

/** The grants on the account itself, all pages. */
export const fetchAccountGrants = async (owner: string): Promise<SacdGrant[]> =>
  (await fetchGrants(owner, { vehicles: false })).accountGrants;

/**
 * The license alias of each address, lowercased, in one query with the
 * addresses as variables. An address that isn't a license, or has no alias,
 * maps to null; when the lookup fails there are no names (an empty map), and
 * the list shows addresses.
 */
export const fetchLicenseAliases = async (
  addresses: string[],
): Promise<Map<string, string | null>> => {
  const aliases = new Map<string, string | null>();
  const ids = [
    ...new Set(
      addresses.map((a) => a.toLowerCase()).filter((a) => ADDRESS_PATTERN.test(a)),
    ),
  ];
  if (ids.length === 0) return aliases;

  const params = ids.map((_, i) => `$c${i}: Address!`).join(', ');
  const fields = ids
    .map((_, i) => `l${i}: developerLicense(by: { clientId: $c${i} }) { alias }`)
    .join('\n  ');
  const query = `query LicenseAliases(${params}) {\n  ${fields}\n}`;
  const variables = Object.fromEntries(ids.map((id, i) => [`c${i}`, id]));

  try {
    const { data } = await queryIdentity<
      Record<string, { alias?: string | null } | null>
    >(query, variables);
    ids.forEach((id, i) => aliases.set(id, data?.[`l${i}`]?.alias || null));
  } catch {
    aliases.clear();
  }
  return aliases;
};

// Aliases per query when asking after many vehicles at once.
const VEHICLES_PER_QUERY = 50;

/**
 * The vehicles among `tokenIds` on which `grantee` still has a grant in force,
 * as identity-api's index has it now: each vehicle's `sacd(grantee)`, 50 to a
 * query, the IDs and the grantee as variables. Throws when an answer isn't whole.
 */
export const fetchVehiclesStillGranted = async (
  tokenIds: number[],
  grantee: string,
): Promise<number[]> => {
  const now = Date.now();
  const still: number[] = [];
  for (let start = 0; start < tokenIds.length; start += VEHICLES_PER_QUERY) {
    const ids = tokenIds.slice(start, start + VEHICLES_PER_QUERY);
    const params = ids.map((_, i) => `$t${i}: Int!`).join(', ');
    const fields = ids
      .map(
        (_, i) =>
          `v${i}: vehicle(tokenId: $t${i}) { sacd(grantee: $grantee) { expiresAt } }`,
      )
      .join('\n  ');
    const query = `query VehiclesStillGranted($grantee: Address!, ${params}) {\n  ${fields}\n}`;
    const variables = {
      grantee: grantee.toLowerCase(),
      ...Object.fromEntries(ids.map((id, i) => [`t${i}`, id])),
    };
    const data = await queryWhole<
      Record<string, { sacd: { expiresAt: string } | null } | null>
    >(query, variables);
    ids.forEach((id, i) => {
      const expiresAt = data[`v${i}`]?.sacd?.expiresAt;
      if (expiresAt && Date.parse(expiresAt) > now) still.push(id);
    });
  }
  return still;
};
