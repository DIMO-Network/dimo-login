export interface Vehicle {
  tokenId: BigInt;
  imageURI: string;
  make: string;
  model: string;
  year: number;
  shared: boolean;
}

export interface VehicleResponse {
  vehicles: Vehicle[];
  hasNextPage: boolean;
  endCursor: string;
  hasPreviousPage: boolean;
  startCursor: string;  
}