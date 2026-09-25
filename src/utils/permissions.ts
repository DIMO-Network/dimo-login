import { getPermissionsArray, Permission } from '@dimo-network/transactions';
import { createPermissionsFromParams } from '../services/permissionsService';
import { PermissionKey, PERMISSIONS_LABEL } from '../types/permissions';

/**
 * A vehicle needs an update when it's already shared with this grantee but is
 * missing something the app is requesting now: a permission, or file access.
 * A grant that already covers the request is left alone, even if it grants
 * more. Sharing again writes a new SACD record over the old one, so no revoke
 * is needed first, and updates keep what the grant already has (see
 * mergePermissions). If the permissions can't be compared, don't prompt.
 */
export const needsPermissionUpdate = (
  vehicle: { shared: boolean; permissions: string; documentAccess?: boolean },
  permissions: string,
  permissionTemplateId?: string,
) =>
  vehicle.shared &&
  (getAddedPermissions([vehicle], permissions, permissionTemplateId).length > 0 ||
    vehicle.documentAccess === false);

/** Permissions the app is requesting that the vehicle hasn't granted yet. */
export const getAddedPermissions = (
  vehicles: { permissions: string }[],
  permissions: string,
  permissionTemplateId?: string,
): Permission[] => {
  try {
    const requested = createPermissionsFromParams(permissions, permissionTemplateId);
    const granted = vehicles.map((v) => getPermissionsArray(BigInt(v.permissions)));
    return requested.filter((p) => granted.some((current) => !current.includes(p)));
  } catch (error) {
    console.error('Error diffing permissions:', error);
    return [];
  }
};

/**
 * What an updated grant should carry: everything the vehicle already grants
 * this app plus what it's requesting now. Only "Stop sharing" removes access.
 */
export const mergePermissions = (
  vehiclePermissions: string,
  requested: Permission[],
): Permission[] => {
  const granted = getPermissionsArray(BigInt(vehiclePermissions || '0'));
  return Array.from(new Set([...granted, ...requested])).sort((a, b) => a - b);
};

export const getPermissionLabel = (permission: Permission) =>
  PERMISSIONS_LABEL[Permission[permission] as PermissionKey];
