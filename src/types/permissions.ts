import { PERMISSIONS as PERMISSIONS_FROM_SDK } from '@dimo-network/transactions';

export type PermissionKey = keyof typeof PERMISSIONS_FROM_SDK;

export type PermissionsObject = {
  [K in PermissionKey]: boolean;
};

export const PERMISSION_KEYS = Object.keys(PERMISSIONS_FROM_SDK) as PermissionKey[];
