import { LocalVehicle, Vehicle, VehicleResponse } from '../models/vehicle';
import { formatDate } from '../utils/dateUtils';
import { fetchVehicles, VehicleNode } from './identityService';

interface VehicleFilters {
  vehicleTokenIds?: string[];
  vehicleMakes?: string[];
  powertrainTypes?: string[];
}

type IParams = {
  ownerAddress: string;
  targetGrantee: string;
  cursor: string;
  direction: string;
  filters?: VehicleFilters;
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

const transformVehicle = (vehicle: LocalVehicle, grantee: string): Vehicle => {
  const sacd = vehicle.sacdForGrantee(grantee);
  return {
    ...vehicle.normalize(),
    shared: !!sacd,
    expiresAt: sacd ? formatDate(sacd.expiresAt) : '',
  };
};

const sortVehiclesByFilters = async (
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

const transformVehicles = (vehicles: LocalVehicle[], grantee: string) => {
  return vehicles
    .map((vehicle) => transformVehicle(vehicle, grantee))
    .sort((a: any, b: any) => Number(a.shared) - Number(b.shared));
};

export const fetchVehiclesWithTransformation = async (
  params: IParams,
): Promise<VehicleResponse> => {
  const { ownerAddress, targetGrantee, cursor, direction, filters = {} } = params;

  const data = await fetchVehicles({ ownerAddress, cursor, direction });
  const { compatibleVehicles, incompatibleVehicles } = await sortVehiclesByFilters(
    data.data.vehicles.nodes,
    filters,
  );

  return {
    hasNextPage: data.data.vehicles.pageInfo.hasNextPage,
    hasPreviousPage: data.data.vehicles.pageInfo.hasPreviousPage,
    startCursor: data.data.vehicles.pageInfo.startCursor || '',
    endCursor: data.data.vehicles.pageInfo.endCursor || '',
    compatibleVehicles: transformVehicles(compatibleVehicles, targetGrantee),
    incompatibleVehicles: transformVehicles(incompatibleVehicles, targetGrantee),
  };
};
