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
  ownerAddress: string;
  cursor: string;
  direction: string;
};

export const fetchVehicles = async (params: IFetchVehicleParams) => {
  const { ownerAddress, direction, cursor } = params;
  const query = `
  {
    vehicles(filterBy: { owner: "${ownerAddress}" }, ${
      direction === 'next'
        ? `first: 100 ${cursor ? `, after: "${cursor}"` : ''}`
        : `last: 100 ${cursor ? `, before: "${cursor}"` : ''}`
    }) {
      nodes {
        tokenId
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

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return await response.json();
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

// TODO - ensure that this only gets called once per device definition ID
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

const getPowertrainTypeFromDeviceDefinition = (deviceDefinition: DeviceDefinition) => {
  const attribute = deviceDefinition.attributes?.find(
    (it) => it.name === 'powertrain_type',
  );
  return attribute?.value;
};

const normalize = (value?: string) => value?.toUpperCase();

export const getPowertrainTypeMatch = async (vehicle: any, powertrainTypes: string[]) => {
  const normalizedPowertrainTypes = powertrainTypes.map(normalize);
  const queryResult = await fetchDeviceDefinition(vehicle.definition.id);
  const normalizedPowertrainType = normalize(
    getPowertrainTypeFromDeviceDefinition(queryResult.deviceDefinition),
  );
  return !!(
    normalizedPowertrainType &&
    normalizedPowertrainTypes.includes(normalizedPowertrainType)
  );
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

  const {
    data: { developerLicense },
  } = await apiResponse.json();

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
