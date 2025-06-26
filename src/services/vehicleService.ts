import { VehicleResponse } from '../models/vehicle';
import { fetchVehicles } from './identityService';
import { IParams } from '../types';
import { sortVehiclesByFilters, transformVehicles } from '../utils/vehicles';

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
