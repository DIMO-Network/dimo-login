import { PERMISSIONS as PERMISSIONS_FROM_SDK } from '@dimo-network/transactions';

export type PermissionKey = keyof typeof PERMISSIONS_FROM_SDK;

export type PermissionsObject = {
  [K in PermissionKey]: boolean;
};

// Order is important, as it is used to create the permission string
export const PERMISSION_KEYS = [
  PERMISSIONS_FROM_SDK.NONLOCATION_TELEMETRY,
  PERMISSIONS_FROM_SDK.COMMANDS,
  PERMISSIONS_FROM_SDK.CURRENT_LOCATION,
  PERMISSIONS_FROM_SDK.ALLTIME_LOCATION,
  PERMISSIONS_FROM_SDK.CREDENTIALS,
  PERMISSIONS_FROM_SDK.STREAMS,
] as PermissionKey[];
