import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { Vehicle } from '../models/vehicle';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import { generateIpfsSources, getPermsValue, setVehiclePermissions } from '../services';
import { SetVehiclePermissions } from '@dimo-network/transactions';

export const useUpdateVehiclePermissions = () => {
  const { validateSession } = useAuthContext();
  const { clientId } = useDevCredentials();

  return async ({
    permissionTemplateId,
    expiration,
    vehicle,
  }: {
    permissionTemplateId: string;
    expiration: bigint;
    vehicle: Vehicle;
  }) => {
    const hasValidSession = await validateSession();
    if (!hasValidSession) {
      throw new Error(INVALID_SESSION_ERROR);
    }
    const perms = getPermsValue(permissionTemplateId ? permissionTemplateId : '1');
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
