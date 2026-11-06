import { VehicleFilters, VehiclePermissionsAction } from '../types';
import { LocalVehicle, Vehicle } from '../models/vehicle';
import { fetchPowertrainTypes } from '../services/identityService';
import { extendByYear, grantEndOf, parseExpirationDate } from './dateUtils';

const transformVehicle = (
  vehicle: LocalVehicle,
  grantee: `0x${string}` | null,
): Vehicle => {
  const sacd = vehicle.getSacdForGrantee(grantee);
  return {
    ...vehicle.normalize(),
    permissions: sacd ? sacd.permissions : '0',
    shared: !!sacd,
    source: sacd?.source ?? '',
    grantExpiresAt: sacd?.expiresAt ?? '',
  };
};

export const transformVehicles = (
  vehicles: LocalVehicle[],
  grantee: `0x${string}` | null,
) => {
  return vehicles
    .map((vehicle) => transformVehicle(vehicle, grantee))
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

const checkPowertrainTypesFilter = (
  vehicle: LocalVehicle,
  powertrainTypes: string[] | undefined,
  powertrains: Map<string, string | null>,
) => {
  if (!powertrainTypes?.length) return true;
  const powertrainType = powertrains.get(vehicle.definitionId);
  if (!powertrainType) return false;
  return powertrainTypes
    .map((val) => val.toLowerCase())
    .includes(powertrainType.toLowerCase());
};

const checkIfFiltersMatch = (
  vehicle: LocalVehicle,
  filters: VehicleFilters,
  powertrains: Map<string, string | null>,
) => {
  const { vehicleTokenIds, vehicleMakes, powertrainTypes } = filters;
  return (
    checkTokenIdsFilter(vehicle, vehicleTokenIds) &&
    checkMakesFilter(vehicle, vehicleMakes) &&
    checkPowertrainTypesFilter(vehicle, powertrainTypes, powertrains)
  );
};

export const sortVehiclesByFilters = async (
  vehicles: LocalVehicle[],
  filters: VehicleFilters,
) => {
  const compatibleVehicles = [];
  const incompatibleVehicles = [];

  const powertrains = filters.powertrainTypes?.length
    ? await fetchPowertrainTypes([
        ...new Set(vehicles.map((vehicle) => vehicle.definitionId)),
      ])
    : new Map<string, string | null>();

  for (const vehicle of vehicles) {
    if (checkIfFiltersMatch(vehicle, filters, powertrains)) {
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
  requestedExpiration?: BigInt,
) => {
  if (actionType === 'revoke') return BigInt(0);
  if (actionType === 'update' && requestedExpiration)
    return keepLaterExpiration(vehicle, requestedExpiration);
  return extendExpirationDateByYear(vehicle);
};

/**
 * An update uses the app's requested expiration, unless the current grant
 * runs longer: updating never shortens access.
 */
export const keepLaterExpiration = (
  vehicle: { grantExpiresAt?: string },
  requested: BigInt,
): bigint => {
  const requestedSeconds = BigInt(requested.toString());
  const currentMs = vehicle.grantExpiresAt ? Date.parse(vehicle.grantExpiresAt) : NaN;
  if (Number.isNaN(currentMs)) return requestedSeconds;
  const currentSeconds = BigInt(Math.floor(currentMs / 1000));
  return currentSeconds > requestedSeconds ? currentSeconds : requestedSeconds;
};
// From the grant's ISO expiry.
// An unknown end isn't extended: counting a year from today could shorten the
// share (Manage doesn't offer Extend then).
const extendExpirationDateByYear = (vehicle: Vehicle) => {
  if (!grantEndOf(vehicle.grantExpiresAt)) {
    throw new Error("Can't extend a share whose end date is unknown");
  }
  return parseExpirationDate(extendByYear(vehicle.grantExpiresAt!));
};
