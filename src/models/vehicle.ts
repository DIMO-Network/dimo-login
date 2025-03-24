export interface Vehicle {
  tokenId: BigInt;
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

export interface MintVehicleVariables  {
  owner: `0x${string}`;
  manufacturerNode: number;
  deviceDefinitionID: string;
  make: string;
  model: string;
  year: string;
  imageURI: string;
  permissions: BigInt;
};
