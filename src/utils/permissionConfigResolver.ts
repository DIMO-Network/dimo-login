import { AllParams } from '../types/params';

interface PermissionConfig {
  permissions?: string;
  permissionTemplateId?: string;
}

interface ResolvedPermissions {
  vehicle: PermissionConfig;
  account: PermissionConfig;
}

/**
 * Resolves permission configurations based on scope and provided params
 *
 * This utility handles the logic for determining which permissions to use
 * for vehicles vs account based on the permissionScope parameter and
 * whether separate configs were provided.
 */
export const resolvePermissionConfigs = (params: AllParams): ResolvedPermissions => {
  const {
    permissionScope = 'vehicle', // default for backward compatibility
    permissions,
    permissionTemplateId,
    vehiclePermissions,
    vehiclePermissionTemplateId,
    accountPermissions,
    accountPermissionTemplateId,
  } = params;

  // If separate configs provided, use them
  if (
    vehiclePermissions ||
    vehiclePermissionTemplateId ||
    accountPermissions ||
    accountPermissionTemplateId
  ) {
    return {
      vehicle: {
        permissions: vehiclePermissions || permissions,
        permissionTemplateId: vehiclePermissionTemplateId || permissionTemplateId,
      },
      account: {
        permissions: accountPermissions || permissions,
        permissionTemplateId: accountPermissionTemplateId || permissionTemplateId,
      },
    };
  }

  // Otherwise, use generic permissions for applicable scope(s)
  const config: PermissionConfig = { permissions, permissionTemplateId };

  return {
    vehicle: permissionScope === 'account' ? {} : config,
    account: permissionScope === 'vehicle' ? {} : config,
  };
};

/**
 * Gets permission config for current context (vehicle or account)
 */
export const getPermissionConfigForType = (
  params: AllParams,
  type: 'vehicle' | 'account',
): PermissionConfig => {
  const resolved = resolvePermissionConfigs(params);
  return resolved[type];
};
