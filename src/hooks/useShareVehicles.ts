import { Vehicle } from '../models/vehicle';
import {
  createPermissionsObject,
  generateIpfsSources,
  setVehiclePermissions,
  setVehiclePermissionsBulk,
} from '../services';
import {
  SetVehiclePermissions,
  SetVehiclePermissionsBulk,
} from '@dimo-network/transactions';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';

const shareSingleVehicle = async (tokenId: string, basePermissions: any) => {
  const vehiclePermissions: SetVehiclePermissions = {
    ...basePermissions,
    tokenId: BigInt(tokenId),
  };
  await setVehiclePermissions(vehiclePermissions);
};
const shareMultipleVehicles = async (tokenIds: string[], basePermissions: any) => {
  const bulkVehiclePermissions: SetVehiclePermissionsBulk = {
    ...basePermissions,
    tokenIds: tokenIds.map((id) => BigInt(id)),
  };
  await setVehiclePermissionsBulk(bulkVehiclePermissions);
};

const shareVehicles = async (tokenIds: string[], basePermissions: any) => {
  if (tokenIds.length === 1) {
    return shareSingleVehicle(tokenIds[0], basePermissions);
  }
  return shareMultipleVehicles(tokenIds, basePermissions);
};

interface Params {
  permissionTemplateId?: string;
  permissions?: string;
  clientId: `0x${string}` | null;
  expirationDate: BigInt;
}

const getBasePermissions = async ({
  permissionTemplateId,
  permissions,
  clientId,
  expirationDate,
}: Params) => {
  const perms = createPermissionsObject(permissions);
  const source = await generateIpfsSources(perms, clientId, expirationDate);
  return {
    grantee: clientId as `0x${string}`,
    permissions,
    expiration: expirationDate,
    source,
  };
};

export const useShareVehicles = () => {
  const { clientId, expirationDate, permissionTemplateId, permissions } =
    useDevCredentials<VehicleManagerMandatoryParams>();
  const { validateSession } = useAuthContext();

  const validate = async () => {
    if (!permissionTemplateId || !clientId) {
      throw new Error('At least one of permissionTemplateId and clientId is missing');
    }
    return !!(await validateSession());
  };

  return async (vehicles: Vehicle[]) => {
    if (!vehicles.length) {
      throw new Error('No vehicles shared');
    }
    const isValid = await validate();
    if (!isValid) throw new Error(INVALID_SESSION_ERROR);
    const tokenIds = vehicles.map((v) => v.tokenId.toString());
    const basePermissions = await getBasePermissions({
      clientId,
      permissionTemplateId,
      permissions,
      expirationDate,
    });
    return shareVehicles(tokenIds, basePermissions);
  };
};
