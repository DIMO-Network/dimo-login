import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { Vehicle } from '../models/vehicle';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import {
  createPermissionsFromParams,
  generateIpfsSources,
  setVehiclePermissions,
} from '../services';
import { generateAttachments } from '../services/permissionsService';
import { SetVehiclePermissions } from '@dimo-network/transactions';
import { toCloudEventAgreements } from '../services/vehicleDocumentAgreements';
import { VehicleManagerMandatoryParams } from '../types';
import { toVehicleAsset } from './useShareVehicles';

type UpdateVehiclePermissionsParams = {
  permissionTemplateId?: string;
  permissions?: string;
  expiration: bigint;
  vehicle: Vehicle;
};

export const useUpdateVehiclePermissions = () => {
  const { validateSession } = useAuthContext();
  const { clientId, region, cloudEvent } =
    useDevCredentials<VehicleManagerMandatoryParams>();

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
    const perms = createPermissionsFromParams(permissions, permissionTemplateId);
    const attachments = generateAttachments(region?.toUpperCase());
    const sources = await generateIpfsSources(perms, clientId, expiration, {
      attachments,
      cloudEventAgreements: toCloudEventAgreements(cloudEvent),
      asset: toVehicleAsset(vehicle),
    });
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
