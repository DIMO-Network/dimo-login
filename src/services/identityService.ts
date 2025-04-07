/**
 * identityService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

import { Vehicle, VehicleResponse } from '../models/vehicle';
import { formatDate } from '../utils/dateUtils';

const GRAPHQL_ENDPOINT =
  process.env.REACT_APP_DIMO_IDENTITY_URL || 'https://identity-api.dev.dimo.zone/query';

type IFetchVehicleParams = {
  ownerAddress: string;
  targetGrantee: string;
  cursor: string;
  direction: string;
  filters?: {
    vehicleTokenIds?: string[];
    vehicleMakes?: string[];
  };
};

const fetchVehicles = async (
  params: Pick<IFetchVehicleParams, 'ownerAddress' | 'cursor' | 'direction'>,
) => {
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

export const fetchVehiclesWithTransformation = async (
  params: IFetchVehicleParams,
): Promise<VehicleResponse> => {
  const {
    ownerAddress,
    targetGrantee,
    cursor,
    direction,
    filters: { vehicleTokenIds, vehicleMakes } = {},
  } = params;
  const data = await fetchVehicles({ ownerAddress, cursor, direction });
  const compatibleVehicles: Vehicle[] = [];
  const incompatibleVehicles: Vehicle[] = [];

  data.data.vehicles.nodes.forEach((vehicle: any) => {
    const tokenIdMatch = vehicleTokenIds?.length
      ? vehicleTokenIds.includes(vehicle.tokenId.toString())
      : true;

    const makeMatch = vehicleMakes?.length
      ? vehicleMakes.some(
          (make) => make.toUpperCase() === vehicle.definition.make.toUpperCase(),
        )
      : true;

    const sacdForGrantee = vehicle.sacds.nodes.find(
      (sacd: any) => sacd.grantee === targetGrantee,
    );

    const transformedVehicle = {
      tokenId: vehicle.tokenId,
      imageURI: vehicle.imageURI,
      shared: Boolean(sacdForGrantee),
      expiresAt: sacdForGrantee ? formatDate(sacdForGrantee.expiresAt) : '',
      make: vehicle.definition.make,
      model: vehicle.definition.model,
      year: vehicle.definition.year,
    };

    // Add to compatible or incompatible based on the conditions
    if (tokenIdMatch && makeMatch) {
      compatibleVehicles.push(transformedVehicle);
    } else {
      incompatibleVehicles.push(transformedVehicle);
    }
  });

  return {
    hasNextPage: data.data.vehicles.pageInfo.hasNextPage,
    hasPreviousPage: data.data.vehicles.pageInfo.hasPreviousPage,
    startCursor: data.data.vehicles.pageInfo.startCursor || '',
    endCursor: data.data.vehicles.pageInfo.endCursor || '',
    compatibleVehicles: compatibleVehicles.sort(
      (a: any, b: any) => Number(a.shared) - Number(b.shared),
    ),
    incompatibleVehicles: incompatibleVehicles.sort(
      (a: any, b: any) => Number(a.shared) - Number(b.shared),
    ),
  };
};

export const isValidClientId = async (
  clientId: string,
  redirectUri: string,
): Promise<{ isValid: boolean; alias: string }> => {
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

  const response = await apiResponse.json();

  // Check if data is not null
  if (!response || !response.data || !response.data.developerLicense) {
    console.error('No data found in the response.');
    return { isValid: false, alias: '' };
  }

  // Access the redirectURIs from the response
  const { redirectURIs, alias } = response.data.developerLicense;

  // Check if redirectURIs exist and contains nodes
  if (redirectURIs && redirectURIs.nodes) {
    // Extract the URIs from the nodes
    const uris = redirectURIs.nodes.map((node: { uri: any }) => node.uri);

    // Verify if the redirectUri exists in the list
    const exists = uris.includes(redirectUri);

    return { isValid: exists, alias: alias || clientId };
  } else {
    console.error('No redirect URIs found.');
    return { isValid: false, alias: '' };
  }
};
