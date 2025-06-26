import { VehicleNode } from '../services';
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
  // must be an anon function instead of an arrow func
  return tokenIds.some(function (tokenId: string) {
    return vehicle.tokenId.toString() === tokenId;
  });
};

const checkMakesFilter = (vehicle: LocalVehicle, makes?: string[]) => {
  if (!makes?.length) return true;
  // must be an anon function instead of an arrow func
  return makes.some(function (make) {
    return vehicle.make.toLowerCase() === make.toLowerCase();
  });
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
  vehicles: VehicleNode[],
  filters: VehicleFilters,
) => {
  const compatibleVehicles = [];
  const incompatibleVehicles = [];

  for (const vehicle of vehicles) {
    const localVehicle = new LocalVehicle(vehicle);
    const isCompatible = await checkIfFiltersMatch(localVehicle, filters);
    if (isCompatible) {
      compatibleVehicles.push(localVehicle);
    } else {
      incompatibleVehicles.push(localVehicle);
    }
  }
  return { compatibleVehicles, incompatibleVehicles };
};
