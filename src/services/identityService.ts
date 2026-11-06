/**
 * identityService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

import { queryIdentity } from './identityGraphql';

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

const GET_DEVICE_DEFINITION_BY_ID = `
  query GetDeviceDefinitionById($id: String!) {
    deviceDefinition(by:{id: $id}) {
      attributes {
        name
        value
      }
    }
  }
`;

type GetDeviceDefinitionByIdQueryResult = {
  deviceDefinition: DeviceDefinition;
};
type DeviceDefinition = {
  attributes?: { name: string; value: string }[] | null;
};

export const fetchDeviceDefinition = async (
  deviceDefinitionId: string,
): Promise<GetDeviceDefinitionByIdQueryResult> => {
  const { data, errors } = await queryIdentity<GetDeviceDefinitionByIdQueryResult>(
    GET_DEVICE_DEFINITION_BY_ID,
    { id: deviceDefinitionId },
  );
  if (errors.length > 0) {
    throw new Error(errors[0].message);
  }
  if (!data) {
    throw new Error('The identity API returned no device definition.');
  }
  return data;
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

  const { data: developerLicenseData } = await queryIdentity<{ developerLicense?: any }>(
    query,
  );
  const { developerLicense } = developerLicenseData || {};

  if (!developerLicense) {
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
