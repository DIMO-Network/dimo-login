export interface Vehicle {
  tokenId: bigint;
  imageURI: string;
  make: string;
  model: string;
  year: number;
  shared: boolean;
  expiresAt:string;
}

export interface VehicleResponse {
  compatibleVehicles: Vehicle[];
  incompatibleVehicles: Vehicle[];
  hasNextPage: boolean;
  endCursor: string;
  hasPreviousPage: boolean;
  startCursor: string;  
}