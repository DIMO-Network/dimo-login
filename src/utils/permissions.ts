import {
  getPermissionsArray,
  getPermissionsValue,
  Permission,
} from '@dimo-network/transactions';
import { createPermissionsFromParams } from '../services/permissionsService';
import { PermissionKey, PERMISSIONS_LABEL } from '../types/permissions';

// undefined when the request or the grant can't be parsed.
const matchesRequestedPermissions = (
  vehiclePermissions: string,
  permissions: string,
  permissionTemplateId?: string,
): boolean | undefined => {
  try {
    const permsValue = getPermissionsValue(
      createPermissionsFromParams(permissions, permissionTemplateId),
    );
    return BigInt(vehiclePermissions) === permsValue;
  } catch (error) {
    console.error('Error comparing permissions:', error);
    return undefined;
  }
};

/**
 * A vehicle needs an update when it's already shared with this grantee, but with
 * a different permission set than the app is requesting now. Sharing again writes
 * a new SACD record over the old one, so no revoke is required first. If the
 * permissions can't be compared, don't prompt: an update would fail the same way.
 */
export const needsPermissionUpdate = (
  vehicle: { shared: boolean; permissions: string },
  permissions: string,
  permissionTemplateId?: string,
) =>
  vehicle.shared &&
  matchesRequestedPermissions(vehicle.permissions, permissions, permissionTemplateId) ===
    false;

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

export const getPermissionLabel = (permission: Permission) =>
  PERMISSIONS_LABEL[Permission[permission] as PermissionKey];
