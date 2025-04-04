/**
 * identityService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

import {Vehicle, VehicleResponse} from "../models/vehicle";
import {formatDate} from "../utils/dateUtils";

const GRAPHQL_ENDPOINT =
  process.env.REACT_APP_DIMO_IDENTITY_URL ||
  "https://identity-api.dev.dimo.zone/query";

// Function to fetch vehicles and transform data
//TODO: Convert to Object Params
export const fetchVehiclesWithTransformation = async (
  ownerAddress: string,
  targetGrantee: string,
  cursor: string,
  direction: string,
  vehicleTokenIds?: string[], // Array of tokenIds to filter by
  vehicleMakes?: string[]
): Promise<VehicleResponse> => {
  const query = `
  {
    vehicles(filterBy: { owner: "${ownerAddress}" }, ${
    direction === "next"
      ? `first: 100 ${cursor ? `, after: "${cursor}"` : ""}`
      : `last: 100 ${cursor ? `, before: "${cursor}"` : ""}`
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();

  const compatibleVehicles: Vehicle[] = [];
  const incompatibleVehicles: Vehicle[] = [];

  // Process vehicles
  data.data.vehicles.nodes.forEach((vehicle: any) => {
    const tokenIdMatch =
      !vehicleTokenIds ||
      vehicleTokenIds.length === 0 ||
      vehicleTokenIds.includes(vehicle.tokenId.toString());

    const makeMatch =
      !vehicleMakes ||
      vehicleMakes.length === 0 ||
      vehicleMakes.some(
        (make) => make.toUpperCase() === vehicle.definition.make.toUpperCase()
      );

    const sacdForGrantee = vehicle.sacds.nodes.find(
      (sacd: any) => sacd.grantee === targetGrantee
    );

    const transformedVehicle = {
      tokenId: vehicle.tokenId,
      imageURI: vehicle.imageURI,
      shared: Boolean(sacdForGrantee), // True if a matching sacd exists
      expiresAt: sacdForGrantee ? formatDate(sacdForGrantee.expiresAt) : "",
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

  // Transform the data
  //TODO: Add strict types
  return {
    hasNextPage: data.data.vehicles.pageInfo.hasNextPage,
    hasPreviousPage: data.data.vehicles.pageInfo.hasPreviousPage,
    startCursor: data.data.vehicles.pageInfo.startCursor || "",
    endCursor: data.data.vehicles.pageInfo.endCursor || "",
    compatibleVehicles: compatibleVehicles.sort(
      (a: any, b: any) => Number(a.shared) - Number(b.shared)
    ),
    incompatibleVehicles: incompatibleVehicles.sort(
      (a: any, b: any) => Number(a.shared) - Number(b.shared)
    ),
  };
};

type DeveloperLicense = {
  alias: string;
  redirectURIs: { nodes: {uri:string}[] }
}
const fetchDeveloperLicense = async (clientId: string): Promise<{developerLicense: DeveloperLicense}> => {
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const response = await apiResponse.json();
  if (!response.data) {
    throw new Error('received not-ok response from API');
  }
  return response.data;
}

export const fetchDeveloperLicenseByClientId = async (
  clientId: string,
): Promise<DeveloperLicense> => {
  const response = await fetchDeveloperLicense(clientId);
  if (!response.developerLicense) {
    throw new Error('Could not retrieve the developer license')
  }
  return response.developerLicense;
};

export const checkDeveloperLicenseParams = (developerLicense: DeveloperLicense, redirectUri: string) => {
  const { redirectURIs } = developerLicense;
  const mappedRedirectUris = redirectURIs.nodes?.map((it: {uri: string}) => it.uri);
  return mappedRedirectUris.includes(redirectUri);
}
