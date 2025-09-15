import { VehicleFilters, VehiclePermissionsAction } from '../types';
import { LocalVehicle, Vehicle } from '../models/vehicle';
import { extendByYear, formatDate, parseExpirationDate } from './dateUtils';
import { hasUpdatedPermissions } from './permissions';

interface TransformVehicleParams {
  vehicle: LocalVehicle;
  grantee: `0x${string}` | null;
  permissionTemplateId: string;
  permissions: string;
}

const transformVehicle = ({
  vehicle,
  grantee,
  permissionTemplateId,
  permissions,
}: TransformVehicleParams): Vehicle => {
  const sacd = vehicle.getSacdForGrantee(grantee);
  const vehiclePermissions = sacd ? sacd.permissions : '0';
  const updatedPermissions = hasUpdatedPermissions(
    vehiclePermissions,
    permissions,
    permissionTemplateId,
  );
  return {
    ...vehicle.normalize(),
    permissions: vehiclePermissions,
    shared: !!sacd,
    expiresAt: sacd ? formatDate(sacd.expiresAt) : '',
    hasOldPermissions: updatedPermissions,
  };
};

interface TransformVehiclesParams {
  vehicles: LocalVehicle[];
  grantee: `0x${string}` | null;
  permissionTemplateId: string;
  permissions: string;
}

export const transformVehicles = ({
  vehicles,
  grantee,
  permissionTemplateId,
  permissions,
}: TransformVehiclesParams) => {
  return vehicles
    .map((vehicle) =>
      transformVehicle({
        vehicle,
        grantee,
        permissionTemplateId,
        permissions,
      }),
    )
    .sort((a: any, b: any) => Number(b.shared) - Number(a.shared));
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
export const getNewExpirationDate = (
  vehicle: Vehicle,
  actionType: VehiclePermissionsAction,
) => {
  return actionType === 'revoke' ? BigInt(0) : extendExpirationDateByYear(vehicle);
};
const extendExpirationDateByYear = (vehicle: Vehicle) => {
  const extendedDate = extendByYear(vehicle.expiresAt);
  return parseExpirationDate(extendedDate);
};
