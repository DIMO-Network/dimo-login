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
import {
  getVehicleAsset,
  toCloudEventAgreements,
} from '../services/vehicleDocumentAgreements';
import { VehicleManagerMandatoryParams, VehiclePermissionsAction } from '../types';

type UpdateVehiclePermissionsParams = {
  permissionTemplateId?: string;
  permissions?: string;
  expiration: bigint;
  vehicle: Vehicle;
  action: VehiclePermissionsAction;
};

// Which actions sign the app's requested file agreements. An update adds them
// (the manage screen lists them first). Extending keeps them only when the
// current grant already has them, and revoking never needs them.
const includesFiles = (action: VehiclePermissionsAction, vehicle: Vehicle) =>
  action === 'update' || (action === 'extend' && vehicle.documentAccess === true);

export const useUpdateVehiclePermissions = () => {
  const { validateSession } = useAuthContext();
  const { clientId, region, cloudEvent } =
    useDevCredentials<VehicleManagerMandatoryParams>();

  return async ({
    permissionTemplateId,
    permissions,
    expiration,
    vehicle,
    action,
  }: UpdateVehiclePermissionsParams) => {
    const hasValidSession = await validateSession();
    if (!hasValidSession) {
      throw new Error(INVALID_SESSION_ERROR);
    }
    const perms = createPermissionsFromParams(permissions, permissionTemplateId);
    const attachments = generateAttachments(region?.toUpperCase());
    const cloudEventAgreements = includesFiles(action, vehicle)
      ? toCloudEventAgreements(cloudEvent)
      : [];
    const sources = await generateIpfsSources(perms, clientId, expiration, {
      attachments,
      cloudEventAgreements,
      asset: getVehicleAsset(vehicle, cloudEventAgreements.length > 0),
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
