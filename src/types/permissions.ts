import { PERMISSIONS as PERMISSIONS_FROM_SDK } from '@dimo-network/transactions';

export type PermissionKey = keyof typeof PERMISSIONS_FROM_SDK;
export const PERMISSIONS = Object.keys(PERMISSIONS_FROM_SDK).reduce(
  (acc, key) => {
    acc[key] = key as PermissionKey;
    return acc;
  },
  {} as Record<string, PermissionKey>,
) as Record<PermissionKey, PermissionKey>;

export type PermissionsObject = {
  [K in PermissionKey]: boolean;
};

// Order is important, as it is used to create the permission string
export const PERMISSION_KEYS = [
  PERMISSIONS.NONLOCATION_TELEMETRY,
  PERMISSIONS.COMMANDS,
  PERMISSIONS.CURRENT_LOCATION,
  PERMISSIONS.ALLTIME_LOCATION,
  PERMISSIONS.CREDENTIALS,
  PERMISSIONS.STREAMS,
] as PermissionKey[];
