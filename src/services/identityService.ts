/**
 * identityService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

const GRAPHQL_ENDPOINT = process.env.REACT_APP_DIMO_IDENTITY_URL;

// Function to fetch vehicles and transform data
export async function fetchVehiclesWithTransformation(
  ownerAddress: string,
  targetGrantee: string,
  vehicleTokenIds?: string[] // Array of tokenIds to filter by
) {
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

  const response = await fetch(GRAPHQL_ENDPOINT!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();

  // Check if vehicleTokenIds is empty

  const filteredVehicles = vehicleTokenIds && vehicleTokenIds.length > 0
    ? data.data.vehicles.nodes.filter((vehicle: any) =>
        vehicleTokenIds.includes(vehicle.tokenId.toString())
      )
    : data.data.vehicles.nodes;

  // Transform the data
  return filteredVehicles.map((vehicle: any) => ({
    tokenId: vehicle.tokenId,
    imageURI: vehicle.imageURI,
    shared: vehicle.sacds.nodes.some(
      (sacd: any) => sacd.grantee === targetGrantee
    ),
    make: vehicle.definition.make,
    model: vehicle.definition.model,
    year: vehicle.definition.year,
  })).sort((a: any, b: any) => Number(a.shared) - Number(b.shared)); // Sort non-shared first
  ;
}


export async function isValidClientId(clientId: string, redirectUri: string) {
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
    return false; // or handle as needed
  }

  // Access the redirectURIs from the response
  const { redirectURIs } = response.data.developerLicense;

  // Check if redirectURIs exist and contains nodes
  if (redirectURIs && redirectURIs.nodes) {
    // Extract the URIs from the nodes
    const uris = redirectURIs.nodes.map((node: { uri: any; }) => node.uri);

    // Verify if the redirectUri exists in the list
    const exists = uris.includes(redirectUri);

    return exists; // Return true if exists, false otherwise
  } else {
    console.error("No redirect URIs found.");
    return false; // or handle as needed
  }
}
