import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { Vehicle } from '../models/vehicle';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import { generateIpfsSources, getPermsValue, setVehiclePermissions } from '../services';
import { SetVehiclePermissions } from '@dimo-network/transactions';

type UpdateVehiclePermissionsParams = {
  permissionTemplateId?: string;
  permissions?: string;
  expiration: bigint;
  vehicle: Vehicle;
};

export const useUpdateVehiclePermissions = () => {
  const { validateSession } = useAuthContext();
  const { clientId } = useDevCredentials();

  return async ({
    permissionTemplateId,
    permissions,
    expiration,
    vehicle,
  }: UpdateVehiclePermissionsParams) => {
    const hasValidSession = await validateSession();
    if (!hasValidSession) {
      throw new Error(INVALID_SESSION_ERROR);
    }
    const perms = getPermsValue(
      permissionTemplateId ? permissionTemplateId : '1',
      permissions,
    );
    const sources = await generateIpfsSources(perms, clientId, expiration);
    const basePermissions = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration,
      source: sources,
    };

    const vehiclePermissions: SetVehiclePermissions = {
      ...basePermissions,
      tokenId: BigInt(vehicle.tokenId),
    };
    await setVehiclePermissions(vehiclePermissions);
  };
};
