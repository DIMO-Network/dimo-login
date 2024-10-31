/**
 * turnkeyService.ts
 *
 * This service handles all actions using the Identity API
 *
 * Specific Responsibilities include: Getting vehicles and their SACD permissions
 */

// identityService.ts

const GRAPHQL_ENDPOINT = process.env.REACT_APP_DIMO_IDENTITY_URL;

// Function to fetch vehicles and transform data
export async function fetchVehiclesWithTransformation(ownerAddress: string, targetGrantee: string) {
  const query = `
    {
      vehicles(filterBy: { owner: "${ownerAddress}" }, first: 100) {
        nodes {
          tokenId
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
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  const data = await response.json();

  // Transforming the data
  return data.data.vehicles.nodes.map((vehicle: any) => ({
    tokenId: vehicle.tokenId,
    shared: vehicle.sacds.nodes.some((sacd: any) => sacd.grantee === targetGrantee),
    make: vehicle.definition.make,
    model: vehicle.definition.model,
    year: vehicle.definition.year
  }));
}