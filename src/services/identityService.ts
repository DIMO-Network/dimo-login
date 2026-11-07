/**
 * identityService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

import { queryIdentity, type IdentityError } from './identityGraphql';

type IFetchVehicleParams = {
  ownerAddress: `0x${string}` | null;
  cursor: string;
  direction: string;
};

const GET_VEHICLES = `
  query GetVehicles(
    $owner: Address!
    $first: Int
    $after: String
    $last: Int
    $before: String
  ) {
    vehicles(
      filterBy: { owner: $owner }
      first: $first
      after: $after
      last: $last
      before: $before
    ) {
      nodes {
        tokenId
        tokenDID
        imageURI
        definition {
          id
          make
          model
          year
        }
        sacds(first: 10) {
          nodes {
            expiresAt
            grantee
            permissions
            source
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
    }
  }
`;

export type VehicleNode = {
  tokenId: number;
  tokenDID: string;
  imageURI: string;
  definition: {
    id: string;
    make: string;
    model: string;
    year: number;
  };
  sacds: {
    nodes: {
      expiresAt: string;
      permissions: string;
      grantee: string;
      source?: string;
    }[];
  };
};

type VehiclesQueryResult = {
  vehicles: {
    nodes: VehicleNode[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
      hasPreviousPage: boolean;
      startCursor: string;
    };
  };
};

export const fetchVehicles = async (
  params: IFetchVehicleParams,
): Promise<{ data: VehiclesQueryResult }> => {
  const { ownerAddress, direction, cursor } = params;
  const variables: Record<string, any> = {
    owner: ownerAddress,
  };
  if (direction === 'next') {
    variables.first = 100;
    if (cursor) variables.after = cursor;
  } else {
    variables.last = 100;
    if (cursor) variables.before = cursor;
  }

  const { data, errors } = await queryIdentity<VehiclesQueryResult>(
    GET_VEHICLES,
    variables,
  );
  if (errors.length > 0) {
    throw new Error(errors[0].message);
  }
  if (!data) {
    throw new Error('The identity API returned no vehicles.');
  }
  return { data };
};

type DeviceDefinitionAttributes = {
  attributes?: { name: string; value: string }[] | null;
} | null;

/**
 * Whether identity-api answered "there's no such record" rather than failing.
 * Licenses, vehicles and connections carry the NOT_FOUND code; device
 * definitions only say so in the message (identity-api's
 * internal/repositories/devicedefinition/devicedefinition.go).
 */
const isNotFoundError = (error: IdentityError) =>
  error.extensions?.code === 'NOT_FOUND' ||
  /no device definition found/i.test(error.message);

/**
 * Looks up the powertrain type of every definition in one request. An id the
 * API doesn't know maps to null, so its vehicle reads as incompatible. Any
 * other failure throws, so an outage isn't read as vehicles being incompatible.
 */
export const fetchPowertrainTypes = async (
  definitionIds: string[],
): Promise<Map<string, string | null>> => {
  const ids = [...new Set(definitionIds)];
  const powertrainTypes = new Map<string, string | null>();
  if (ids.length === 0) return powertrainTypes;

  const params = ids.map((_, i) => `$id${i}: String!`).join(', ');
  const fields = ids
    .map(
      (_, i) =>
        `d${i}: deviceDefinition(by: { id: $id${i} }) { attributes { name value } }`,
    )
    .join('\n  ');
  const query = `query PowertrainTypes(${params}) {\n  ${fields}\n}`;
  const variables = Object.fromEntries(ids.map((id, i) => [`id${i}`, id]));

  const { data, errors } = await queryIdentity<
    Record<string, DeviceDefinitionAttributes>
  >(query, variables);
  if (!data) {
    throw new Error('The identity API returned no device definitions.');
  }
  ids.forEach((id, i) => {
    const alias = `d${i}`;
    const definition = data[alias];
    if (!definition) {
      // An error without a path isn't tied to one definition, so it counts too.
      const error = errors.find((e) => e.path?.[0] === alias || !e.path);
      if (error && !isNotFoundError(error)) throw new Error(error.message);
    }
    const attribute = definition?.attributes?.find(
      (att) => att.name === 'powertrain_type',
    );
    powertrainTypes.set(id, attribute?.value ?? null);
  });
  return powertrainTypes;
};

export const getFirstOwnedDeveloperLicense = async (
  ownerAddress: string,
): Promise<{ tokenId: number; clientId: string; redirectUris: string[] } | null> => {
  const query = `{
    developerLicenses(first: 1, filterBy: { owner: "${ownerAddress}" }) {
      nodes {
        tokenId
        clientId
        redirectURIs(first: 100) {
          nodes {
            uri
          }
        }
      }
    }
  }`;

  const { data } = await queryIdentity<{
    developerLicenses?: {
      nodes?: {
        tokenId: number;
        clientId: string;
        redirectURIs?: { nodes?: { uri: string }[] };
      }[];
    };
  }>(query);
  const node = data?.developerLicenses?.nodes?.[0];
  if (!node) return null;
  return {
    tokenId: node.tokenId,
    clientId: node.clientId,
    redirectUris: node.redirectURIs?.nodes?.map((n: { uri: string }) => n.uri) ?? [],
  };
};

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export const getDeveloperLicense = async (clientId: string) => {
  // The client ID comes from the app and goes into the query text.
  if (!ADDRESS_PATTERN.test(clientId)) {
    console.error('Client ID is not an address.');
    return null;
  }
  const query = `{
    developerLicense(by: { clientId: "${clientId}" }) {
      owner
      alias
      redirectURIs(first: 100) {
        totalCount
        nodes {
          uri
        }
      }      
    }
  }`;

  const { data: developerLicenseData, errors } = await queryIdentity<{
    developerLicense?: any;
  }>(query);
  const { developerLicense } = developerLicenseData || {};

  if (!developerLicense) {
    // An unknown client ID is a bad setup (null); a failed lookup is an outage.
    const failure = errors.find((error) => !isNotFoundError(error));
    if (failure) throw new Error(failure.message);
    console.error('No data found in the response.');
    return null;
  }

  return developerLicense;
};

export const isValidDeveloperLicense = async (
  developerLicense: any,
  redirectUri: string,
): Promise<boolean> => {
  if (!developerLicense) {
    console.error('No data found in the response.');
    return false;
  }

  const { redirectURIs } = developerLicense;

  if (redirectUri && redirectURIs && redirectURIs.nodes) {
    const uris = redirectURIs.nodes.map((node: { uri: any }) => node.uri);
    const exists = uris.includes(redirectUri);

    return exists;
  }

  console.error('No redirect URIs found.');
  return false;
};

export const getLicenseAlias = async (developerLicense: any, clientId: string) => {
  if (!developerLicense) {
    console.error('No data found in the response.');
    return '';
  }
  const { alias } = developerLicense;

  return alias || clientId;
};
