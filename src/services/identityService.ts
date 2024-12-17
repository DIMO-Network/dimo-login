/**
 * identityService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

import { Vehicle } from "../models/vehicle";

const GRAPHQL_ENDPOINT =
  process.env.REACT_APP_DIMO_IDENTITY_URL ||
  "https://identity-api.dev.dimo.zone/query";

// Function to fetch vehicles and transform data
//TODO: Convert to Object Params
export const fetchVehiclesWithTransformation = async (
  ownerAddress: string,
  targetGrantee: string,
  vehicleTokenIds?: string[], // Array of tokenIds to filter by
  vehicleMakes?: string[]
): Promise<Vehicle[]> => {
  const query = `
    {
      vehicles(filterBy: { owner: "${ownerAddress}" }, first: 100) {
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

  const filteredVehicles = data.data.vehicles.nodes.filter((vehicle: any) => {
    // Filter on tokenIds if provided
    const tokenIdMatch =
      !vehicleTokenIds ||
      vehicleTokenIds.length === 0 ||
      vehicleTokenIds.includes(vehicle.tokenId.toString());

    // Filter on vehicleMakes if provided
    const makeMatch =
      !vehicleMakes ||
      vehicleMakes.length === 0 ||
      vehicleMakes.some(
        (make) => make.toUpperCase() === vehicle.definition.make.toUpperCase()
      );

    // Include the vehicle only if both conditions match
    return tokenIdMatch && makeMatch;
  });

  // Transform the data
  //TODO: Add strict types
  return filteredVehicles
    .map((vehicle: any) => ({
      tokenId: vehicle.tokenId,
      imageURI: vehicle.imageURI,
      shared: vehicle.sacds.nodes.some(
        (sacd: any) => sacd.grantee === targetGrantee
      ),
      make: vehicle.definition.make,
      model: vehicle.definition.model,
      year: vehicle.definition.year,
    }))
    .sort((a: any, b: any) => Number(a.shared) - Number(b.shared)); // Sort non-shared first
};

export const isValidClientId = async (
  clientId: string,
  redirectUri: string
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const response = await apiResponse.json();

  // Check if data is not null
  if (!response || !response.data || !response.data.developerLicense) {
    console.error("No data found in the response.");
    return { isValid: false, alias: "" };
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
    console.error("No redirect URIs found.");
    return { isValid: false, alias: "" };
  }
};
