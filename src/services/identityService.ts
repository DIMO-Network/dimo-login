/**
 * identityService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

import { apolloClient } from './apollo';
import { gql } from '@apollo/client';

const GRAPHQL_ENDPOINT =
  process.env.REACT_APP_DIMO_IDENTITY_URL || 'https://identity-api.dev.dimo.zone/query';

type IFetchVehicleParams = {
  ownerAddress: `0x${string}` | null;
  cursor: string;
  direction: string;
};

const GET_VEHICLES = gql`
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
      permissions: bigint;
      grantee: string;
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

  const result = await apolloClient.query<{ vehicles: VehiclesQueryResult['vehicles'] }>({
    query: GET_VEHICLES,
    variables,
    fetchPolicy: 'network-only',
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return { data: result.data };
};

const GET_DEVICE_DEFINITION_BY_ID = gql(`
  query GetDeviceDefinitionById($id: String!) {
    deviceDefinition(by:{id: $id}) {
      attributes {
        name
        value
      }
    }
  }
`);

type GetDeviceDefinitionByIdQueryResult = {
  deviceDefinition: DeviceDefinition;
};
type DeviceDefinition = {
  attributes?: { name: string; value: string }[] | null;
};

export const fetchDeviceDefinition = async (
  deviceDefinitionId: string,
): Promise<GetDeviceDefinitionByIdQueryResult> => {
  const result = await apolloClient.query({
    query: GET_DEVICE_DEFINITION_BY_ID,
    variables: { id: deviceDefinitionId },
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
};

export const getDeveloperLicense = async (clientId: string) => {
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

  const apiResponse = await fetch(GRAPHQL_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const { data: developerLicenseData } = await apiResponse.json();
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
