import { Permission as PERMISSIONS_FROM_SDK } from '@dimo-network/transactions';

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
