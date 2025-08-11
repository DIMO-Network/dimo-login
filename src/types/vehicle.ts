export interface TeslaVehicle {
  make: string;
  model: string;
  year: string;
  deviceDefinitionId: string;
  vin?: string;
  country: string;
}

export interface VehicleFilters {
  vehicleTokenIds?: string[];
  vehicleMakes?: string[];
  powertrainTypes?: string[];
}

export type IParams = {
  ownerAddress: `0x${string}` | null;
  targetGrantee: `0x${string}` | null;
  cursor: string;
  direction: string;
  filters?: VehicleFilters;
};

export type VehiclePermissionsAction = 'revoke' | 'extend';
