import { getPermissionsValue } from '@dimo-network/transactions';
import { createPermissionsFromParams } from '../services/permissionsService';

export const hasUpdatedPermissions = (
  vehiclePermissions: bigint,
  permissions: string,
  permissionTemplateId?: string,
) => {
  const permsValue = getPermissionsValue(
    createPermissionsFromParams(permissions, permissionTemplateId),
  );

  return vehiclePermissions === permsValue;
};
