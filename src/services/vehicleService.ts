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

const getTokenIdMatch = (vehicle: LocalVehicle, tokenIds?: string[]) => {
  if (!tokenIds?.length) return true;
  // must be an anon function instead of an arrow func
  return tokenIds.some(function (tokenId: string) {
    return vehicle.getTokenIdMatch(tokenId);
  });
};

const getMakeMatch = (vehicle: LocalVehicle, makes?: string[]) => {
  if (!makes?.length) return true;
  // must be an anon function instead of an arrow func
  return makes.some(function (make) {
    return vehicle.getMakeMatch(make);
  });
};

const getPowertrainTypeMatchNew = async (
  vehicle: LocalVehicle,
  powertrainTypes?: string[],
) => {
  if (!powertrainTypes?.length) return true;
  return await vehicle.getPowertrainTypeMatch(powertrainTypes);
};

export const checkForCompatability = async (
  vehicle: LocalVehicle,
  filters: VehicleFilters,
) => {
  const { vehicleTokenIds, vehicleMakes, powertrainTypes } = filters;
  const tokenIdMatch = getTokenIdMatch(vehicle, vehicleTokenIds);
  const makeMatch = getMakeMatch(vehicle, vehicleMakes);
  const powertrainTypeMatch = await getPowertrainTypeMatchNew(vehicle, powertrainTypes);
  return tokenIdMatch && makeMatch && powertrainTypeMatch;
};

const transformVehicle = (vehicle: LocalVehicle) => {
  return {
    tokenId: vehicle.tokenId.toString(),
    imageURI: vehicle.imageURI,
    shared: vehicle.isShared,
    expiresAt: vehicle.expiresAt ? formatDate(vehicle.expiresAt) : '',
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
  };
};

const transformAndSortVehicles = async (
  vehicles: VehicleNode[],
  targetGrantee: string,
  filters: VehicleFilters,
) => {
  const compatibleVehicles: Vehicle[] = [];
  const incompatibleVehicles: Vehicle[] = [];

  for (const vehicle of vehicles) {
    const localVehicle = new LocalVehicle(vehicle, targetGrantee);
    const isCompatible = await checkForCompatability(localVehicle, filters);
    const transformedVehicle = transformVehicle(localVehicle);
    if (isCompatible) {
      compatibleVehicles.push(transformedVehicle);
    } else {
      incompatibleVehicles.push(transformedVehicle);
    }
  }
  return { compatibleVehicles, incompatibleVehicles };
};

export const fetchVehiclesWithTransformation = async (
  params: IParams,
): Promise<VehicleResponse> => {
  const { ownerAddress, targetGrantee, cursor, direction, filters = {} } = params;

  const data = await fetchVehicles({ ownerAddress, cursor, direction });
  const { compatibleVehicles, incompatibleVehicles } = await transformAndSortVehicles(
    data.data.vehicles.nodes,
    targetGrantee,
    filters,
  );

  return {
    hasNextPage: data.data.vehicles.pageInfo.hasNextPage,
    hasPreviousPage: data.data.vehicles.pageInfo.hasPreviousPage,
    startCursor: data.data.vehicles.pageInfo.startCursor || '',
    endCursor: data.data.vehicles.pageInfo.endCursor || '',
    compatibleVehicles: compatibleVehicles.sort(
      (a: any, b: any) => Number(a.shared) - Number(b.shared),
    ),
    incompatibleVehicles: incompatibleVehicles.sort(
      (a: any, b: any) => Number(a.shared) - Number(b.shared),
    ),
  };
};
