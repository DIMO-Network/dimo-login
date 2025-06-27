import { VehicleFilters } from '../types';
import { LocalVehicle, Vehicle } from '../models/vehicle';
import { formatDate } from './dateUtils';

const transformVehicle = (vehicle: LocalVehicle, grantee: string): Vehicle => {
  const sacd = vehicle.sacdForGrantee(grantee);
  return {
    ...vehicle.normalize(),
    shared: !!sacd,
    expiresAt: sacd ? formatDate(sacd.expiresAt) : '',
  };
};

export const transformVehicles = (vehicles: LocalVehicle[], grantee: string) => {
  return vehicles
    .map((vehicle) => transformVehicle(vehicle, grantee))
    .sort((a: any, b: any) => Number(a.shared) - Number(b.shared));
};

const checkTokenIdsFilter = (vehicle: LocalVehicle, tokenIds?: string[]) => {
  if (!tokenIds?.length) return true;
  return tokenIds.includes(vehicle.tokenId.toString());
};

const checkMakesFilter = (vehicle: LocalVehicle, makes?: string[]) => {
  if (!makes?.length) return true;
  return makes.map((make) => make.toLowerCase()).includes(vehicle.make.toLowerCase());
};

const checkPowertrainTypesFilter = async (
  vehicle: LocalVehicle,
  powertrainTypes?: string[],
) => {
  if (!powertrainTypes?.length) return true;
  const powertrainType = await vehicle.getPowertrainType();
  if (powertrainType) {
    return powertrainTypes
      .map((val) => val.toLowerCase())
      .includes(powertrainType.toLowerCase());
  }
  return false;
};

export const checkIfFiltersMatch = async (
  vehicle: LocalVehicle,
  filters: VehicleFilters,
) => {
  const { vehicleTokenIds, vehicleMakes, powertrainTypes } = filters;
  const tokenIdMatch = checkTokenIdsFilter(vehicle, vehicleTokenIds);
  const makeMatch = checkMakesFilter(vehicle, vehicleMakes);
  const powertrainTypeMatch = await checkPowertrainTypesFilter(vehicle, powertrainTypes);
  return tokenIdMatch && makeMatch && powertrainTypeMatch;
};

export const sortVehiclesByFilters = async (
  vehicles: LocalVehicle[],
  filters: VehicleFilters,
) => {
  const compatibleVehicles = [];
  const incompatibleVehicles = [];

  for (const vehicle of vehicles) {
    const isCompatible = await checkIfFiltersMatch(vehicle, filters);
    if (isCompatible) {
      compatibleVehicles.push(vehicle);
    } else {
      incompatibleVehicles.push(vehicle);
    }
  }
  return { compatibleVehicles, incompatibleVehicles };
};
