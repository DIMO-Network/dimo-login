import { getPermissionsValue } from '@dimo-network/transactions';
import { createPermissionsFromParams } from '../services/permissionsService';

export const hasUpdatedPermissions = (
  vehiclePermissions: string,
  permissions: string,
  permissionTemplateId?: string,
) => {
  try {
    const permsValue = getPermissionsValue(
      createPermissionsFromParams(permissions, permissionTemplateId),
    );
    return BigInt(vehiclePermissions) === permsValue;
  } catch (error) {
    console.error('Error comparing permissions:', error);
    return false;
  }
};
