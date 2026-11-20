import { getPermissionsArray, Permission } from '@dimo-network/transactions';
import {
  createPermissionsFromParams,
  permissionsToString,
} from '../services/permissionsService';
import { GrantUnreadableError } from '../services/vehicleDocumentAgreements';
import { PermissionKey } from '../types/permissions';
import { t, type TranslationKey } from '../i18n';

/**
 * A vehicle needs an update when it's already shared with this grantee but is
 * missing something the app is requesting now (a permission, or file access),
 * or has a permission the user switched off on the request card. A grant that
 * already covers the request is otherwise left alone, even if it grants more.
 * Sharing again writes a new SACD record over the old one, so no revoke is
 * needed first, and updates keep what the grant already has except what was
 * switched off (see mergePermissions). If the permissions can't be compared,
 * don't prompt.
 */
export const needsPermissionUpdate = (
  vehicle: { shared: boolean; permissions: string; documentAccess?: boolean },
  permissions: string,
  permissionTemplateId?: string,
  declined: Permission[] = [],
) =>
  vehicle.shared &&
  (getAddedPermissions([vehicle], permissions, permissionTemplateId).length > 0 ||
    getRemovedPermissions(vehicle, declined).length > 0 ||
    vehicle.documentAccess === false);

/** Switched-off permissions the vehicle's grant has, which an update removes. */
export const getRemovedPermissions = (
  vehicle: { permissions: string },
  declined: Permission[],
): Permission[] => {
  if (!declined.length) return [];
  try {
    const granted = getPermissionsArray(BigInt(vehicle.permissions || '0'));
    return declined.filter((p) => granted.includes(p)).sort((a, b) => a - b);
  } catch (error) {
    console.error('Error reading granted permissions:', error);
    return [];
  }
};

/**
 * The app's request without what the user switched off, in the form the
 * request arrives in. Nothing switched off: the request exactly as sent.
 */
export const narrowRequest = (
  permissions: string,
  permissionTemplateId: string | undefined,
  declined: Permission[],
): { permissions: string; permissionTemplateId?: string } => {
  if (!declined.length) return { permissions, permissionTemplateId };
  const kept = createPermissionsFromParams(permissions, permissionTemplateId).filter(
    (p) => !declined.includes(p),
  );
  return { permissions: permissionsToString(kept), permissionTemplateId: undefined };
};

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
 * this app plus what it's requesting now, less what the user switched off on
 * the request card (`declined`), even when the old grant had it. Nothing else
 * is ever dropped; "Stop sharing" removes the rest. A grant using permission
 * bits this SDK can't encode is refused rather than re-signed without them.
 */
export const mergePermissions = (
  vehicle: { permissions: string; tokenId: number; make?: string; model?: string },
  requested: Permission[],
  declined: Permission[] = [],
): Permission[] => {
  const value = BigInt(vehicle.permissions || '0');
  if (!isFullyKnown(value)) {
    throw new GrantUnreadableError(vehicle, 'unknown_permissions');
  }
  const granted = getPermissionsArray(value);
  return Array.from(new Set([...granted, ...requested]))
    .filter((p) => !declined.includes(p))
    .sort((a, b) => a - b);
};

export const permissionKey = (permission: Permission) =>
  Permission[permission] as PermissionKey | undefined;

// One argument only, so these work as `.map(getPermissionLabel)`.
export const getPermissionLabel = (permission: Permission): string => {
  const key = permissionKey(permission);
  return key
    ? t(`permission.${key}.label` as TranslationKey)
    : t('permission.unknown.label', { id: permission });
};
