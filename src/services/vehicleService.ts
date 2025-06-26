import { LocalVehicle, VehicleResponse } from '../models/vehicle';
import { fetchVehicles } from './identityService';
import { IParams } from '../types';
import { sortVehiclesByFilters, transformVehicles } from '../utils/vehicles';

export const fetchVehiclesWithTransformation = async (
  params: IParams,
): Promise<VehicleResponse> => {
  const { ownerAddress, targetGrantee, cursor, direction, filters = {} } = params;

  const {
    data: {
      vehicles: { nodes, pageInfo },
    },
  } = await fetchVehicles({ ownerAddress, cursor, direction });

  const { compatibleVehicles, incompatibleVehicles } = await sortVehiclesByFilters(
    nodes.map((vehicle) => new LocalVehicle(vehicle)),
    filters,
  );

  return {
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: pageInfo.hasPreviousPage,
    startCursor: pageInfo.startCursor || '',
    endCursor: pageInfo.endCursor || '',
    compatibleVehicles: transformVehicles(compatibleVehicles, targetGrantee),
    incompatibleVehicles: transformVehicles(incompatibleVehicles, targetGrantee),
  };
};
