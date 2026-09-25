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
  mergeAgreements,
  readGrantAgreements,
  toCloudEventAgreements,
  withSource,
} from '../services/vehicleDocumentAgreements';
import { mergePermissions } from '../utils/permissions';
import { VehicleManagerMandatoryParams, VehiclePermissionsAction } from '../types';

type UpdateVehiclePermissionsParams = {
  permissionTemplateId?: string;
  permissions?: string;
  expiration: bigint;
  vehicle: Vehicle;
  action: VehiclePermissionsAction;
};

export const useUpdateVehiclePermissions = () => {
  const { validateSession, user } = useAuthContext();
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
    const requested = createPermissionsFromParams(permissions, permissionTemplateId);

    // Stop sharing expires the grant; there's nothing to carry over. Extend and
    // Update keep everything the current grant gives this app, and Update adds
    // what's being requested (the manage screen lists it first). If the current
    // grant can't be read, readGrantAgreements throws and nothing is sent.
    let perms = requested;
    let cloudEventAgreements: ReturnType<typeof toCloudEventAgreements> = [];
    if (action !== 'revoke') {
      const existing = await readGrantAgreements(vehicle, {
        grantor: user?.smartContractAddress,
        grantee: clientId,
      });
      perms = mergePermissions(vehicle, requested);
      cloudEventAgreements =
        action === 'update'
          ? mergeAgreements(
              existing,
              withSource(toCloudEventAgreements(cloudEvent), user?.smartContractAddress),
            )
          : existing;
    }

    const attachments = generateAttachments(region?.toUpperCase());
    const sources = await generateIpfsSources(perms, clientId, expiration, {
      attachments,
      cloudEventAgreements,
      asset: getVehicleAsset(vehicle, cloudEventAgreements.length > 0),
    });
    const vehiclePermissions: SetVehiclePermissions = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration,
      source: sources,
      tokenId: BigInt(vehicle.tokenId),
    };
    await setVehiclePermissions(vehiclePermissions);
  };
};
