import { LocalVehicle, VehicleResponse } from '../models/vehicle';
import { fetchVehicles } from './identityService';
import { IParams } from '../types';
import { sortVehiclesByFilters, transformVehicles } from '../utils/vehicles';

interface FetchVehiclesWithTransformationParams extends IParams {
  permissionTemplateId: string;
  permissions: string;
}

export const fetchVehiclesWithTransformation = async (
  params: FetchVehiclesWithTransformationParams,
): Promise<VehicleResponse> => {
  const {
    ownerAddress,
    targetGrantee,
    cursor,
    direction,
    filters = {},
    permissionTemplateId,
    permissions,
  } = params;

  const {
    data: {
      vehicles: { nodes, pageInfo },
    },
  } = await fetchVehicles({ ownerAddress, cursor, direction });

  const { compatibleVehicles, incompatibleVehicles } = await sortVehiclesByFilters(
    nodes.map((vehicle) => new LocalVehicle(vehicle)),
    filters,
  );

  const transformedCompatibleVehicles = transformVehicles({
    vehicles: compatibleVehicles,
    grantee: targetGrantee,
    permissionTemplateId,
    permissions,
  });

  const transformedIncompatibleVehicles = transformVehicles({
    vehicles: incompatibleVehicles,
    grantee: targetGrantee,
    permissionTemplateId,
    permissions,
  });

  const hasVehicleWithOldPermissions = [
    ...transformedCompatibleVehicles,
    ...transformedIncompatibleVehicles,
  ].some((vehicle) => vehicle.hasOldPermissions);

  return {
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: pageInfo.hasPreviousPage,
    startCursor: pageInfo.startCursor || '',
    endCursor: pageInfo.endCursor || '',
    compatibleVehicles: transformedCompatibleVehicles,
    incompatibleVehicles: transformedIncompatibleVehicles,
    hasVehicleWithOldPermissions,
  };
};
