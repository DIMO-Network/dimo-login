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
  return tokenIds.some(function (tokenId: string) {
    // must be an anon function instead of an arrow func
    return vehicle.getTokenIdMatch(tokenId);
  });
};

const getMakeMatch = (vehicle: LocalVehicle, makes?: string[]) => {
  if (!makes?.length) return true;
  return makes.some(function (make) {
    // must be an anon function instead of an arrow func
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

const transformVehicle = (vehicle: VehicleNode, targetGrantee: string) => {
  const sacdForGrantee = vehicle.sacds.nodes.find(
    (sacd: any) => sacd.grantee === targetGrantee,
  );
  return {
    tokenId: vehicle.tokenId.toString(),
    imageURI: vehicle.imageURI,
    shared: Boolean(sacdForGrantee),
    expiresAt: sacdForGrantee ? formatDate(sacdForGrantee.expiresAt) : '',
    make: vehicle.definition.make,
    model: vehicle.definition.model,
    year: vehicle.definition.year,
  };
};

export const fetchVehiclesWithTransformation = async (
  params: IParams,
): Promise<VehicleResponse> => {
  const { ownerAddress, targetGrantee, cursor, direction, filters = {} } = params;
  const compatibleVehicles: Vehicle[] = [];
  const incompatibleVehicles: Vehicle[] = [];

  const data = await fetchVehicles({ ownerAddress, cursor, direction });
  for (const vehicle of data.data.vehicles.nodes) {
    const isCompatible = await checkForCompatability(
      new LocalVehicle(vehicle, targetGrantee),
      filters,
    );
    const transformedVehicle = transformVehicle(vehicle, targetGrantee);
    if (isCompatible) {
      compatibleVehicles.push(transformedVehicle);
    } else {
      incompatibleVehicles.push(transformedVehicle);
    }
  }

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
