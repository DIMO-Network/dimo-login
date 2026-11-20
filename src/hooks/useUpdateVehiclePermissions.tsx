import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { Vehicle } from '../models/vehicle';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import {
  createPermissionsFromParams,
  generateAttachments,
} from '../services/permissionsService';
import { generateIpfsSources, setVehiclePermissions } from '../services/turnkeyService';
import { Permission, SetVehiclePermissions } from '@dimo-network/transactions';
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
  /** Switched off on the request card: left out, and removed if granted. */
  declined?: Permission[];
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
    declined = [],
  }: UpdateVehiclePermissionsParams) => {
    const hasValidSession = await validateSession();
    if (!hasValidSession) {
      throw new Error(INVALID_SESSION_ERROR);
    }
    const requested = createPermissionsFromParams(
      permissions,
      permissionTemplateId,
    ).filter((p) => !declined.includes(p));

    // Stop sharing expires the grant; there's nothing to carry over. Extend and
    // Update keep everything the current grant gives this app except what was
    // switched off on the request card, and Update adds what's being requested
    // (the manage screen lists it first). If the current grant can't be read,
    // readGrantAgreements throws and nothing is sent.
    let perms = requested;
    let cloudEventAgreements: ReturnType<typeof toCloudEventAgreements> = [];
    if (action !== 'revoke') {
      const existing = await readGrantAgreements(vehicle, {
        grantor: user?.smartContractAddress,
        grantee: clientId,
      });
      perms = mergePermissions(vehicle, requested, declined);
      // Switching everything off would sign a grant with no permissions.
      if (declined.length && !perms.length) {
        throw new Error('No permissions provided');
      }
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
