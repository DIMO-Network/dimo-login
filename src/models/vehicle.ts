export interface Vehicle {
  tokenId: BigInt;
  imageURI: string;
  make: string;
  model: string;
  year: number;
  shared: boolean;
}

export interface VehicleResponse {
  compatibleVehicles: Vehicle[];
  incompatibleVehicles: Vehicle[];
  hasNextPage: boolean;
  endCursor: string;
  hasPreviousPage: boolean;
  startCursor: string;  
}