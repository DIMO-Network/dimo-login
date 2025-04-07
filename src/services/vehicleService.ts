import { Vehicle, VehicleResponse } from '../models/vehicle';
import { formatDate } from '../utils/dateUtils';
import { fetchVehicles, getPowertrainTypeMatch } from './identityService';

type IParams = {
  ownerAddress: string;
  targetGrantee: string;
  cursor: string;
  direction: string;
  filters?: {
    vehicleTokenIds?: string[];
    vehicleMakes?: string[];
    powertrainTypes?: string[];
  };
};

export const fetchVehiclesWithTransformation = async (
  params: IParams,
): Promise<VehicleResponse> => {
  const {
    ownerAddress,
    targetGrantee,
    cursor,
    direction,
    filters: { vehicleTokenIds, vehicleMakes, powertrainTypes } = {},
  } = params;
  const data = await fetchVehicles({ ownerAddress, cursor, direction });
  const compatibleVehicles: Vehicle[] = [];
  const incompatibleVehicles: Vehicle[] = [];
  for (const vehicle of data.data.vehicles.nodes) {
    const tokenIdMatch = vehicleTokenIds?.length
      ? vehicleTokenIds.includes(vehicle.tokenId.toString())
      : true;

    const makeMatch = vehicleMakes?.length
      ? vehicleMakes.some(
          (make) => make.toUpperCase() === vehicle.definition.make.toUpperCase(),
        )
      : true;
    const powertrainTypeMatch = powertrainTypes?.length
      ? await getPowertrainTypeMatch(vehicle, powertrainTypes)
      : true;

    const sacdForGrantee = vehicle.sacds.nodes.find(
      (sacd: any) => sacd.grantee === targetGrantee,
    );

    const transformedVehicle = {
      tokenId: vehicle.tokenId,
      imageURI: vehicle.imageURI,
      shared: Boolean(sacdForGrantee),
      expiresAt: sacdForGrantee ? formatDate(sacdForGrantee.expiresAt) : '',
      make: vehicle.definition.make,
      model: vehicle.definition.model,
      year: vehicle.definition.year,
    };

    // Add to compatible or incompatible based on the conditions
    if (tokenIdMatch && makeMatch && powertrainTypeMatch) {
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
