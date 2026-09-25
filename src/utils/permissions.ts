import { getPermissionsArray, Permission } from '@dimo-network/transactions';
import { createPermissionsFromParams } from '../services/permissionsService';
import { GrantUnreadableError } from '../services/vehicleDocumentAgreements';
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

const KNOWN_PERMISSIONS = Object.values(Permission).filter(
  (p): p is Permission => typeof p === 'number',
);

// True when every set bit belongs to a whole permission this SDK knows, so the
// grant can be decoded and re-signed without losing anything.
const isFullyKnown = (value: bigint) => {
  let known = BigInt(0);
  for (const p of KNOWN_PERMISSIONS) {
    const chunk = (value >> BigInt(p * 2)) & BigInt(3);
    if (chunk === BigInt(1) || chunk === BigInt(2)) return false;
    known |= BigInt(3) << BigInt(p * 2);
  }
  return (value & ~known) === BigInt(0);
};

/**
 * What an updated grant should carry: everything the vehicle already grants
 * this app plus what it's requesting now. Only "Stop sharing" removes access.
 * A grant using permission bits this SDK can't encode is refused rather than
 * re-signed without them.
 */
export const mergePermissions = (
  vehicle: { permissions: string; tokenId: number; make?: string; model?: string },
  requested: Permission[],
): Permission[] => {
  const value = BigInt(vehicle.permissions || '0');
  if (!isFullyKnown(value)) {
    throw new GrantUnreadableError(
      vehicle,
      "It uses permissions this version of DIMO can't carry over.",
    );
  }
  const granted = getPermissionsArray(value);
  return Array.from(new Set([...granted, ...requested])).sort((a, b) => a - b);
};

export const getPermissionLabel = (permission: Permission) =>
  PERMISSIONS_LABEL[Permission[permission] as PermissionKey];
