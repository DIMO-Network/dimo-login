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
  ownerAddress: string;
  targetGrantee: string;
  cursor: string;
  direction: string;
  filters?: VehicleFilters;
};
