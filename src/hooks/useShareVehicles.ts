import { Vehicle } from '../models/vehicle';
import {
  createPermissionsFromParams,
  generateIpfsSources,
  setVehiclePermissions,
  setVehiclePermissionsBulk,
} from '../services';
import {
  setVehiclePermissionsBatch,
  VEHICLE_PERMISSIONS_BATCH_LIMIT,
} from '../services/turnkeyService';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import { generateAttachments } from '../services/permissionsService';
import {
  getVehicleAsset,
  toCloudEventAgreements,
} from '../services/vehicleDocumentAgreements';

export const useShareVehicles = () => {
  const {
    clientId,
    expirationDate,
    permissionTemplateId,
    permissions,
    region,
    cloudEvent,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { validateSession } = useAuthContext();

  const validate = async () => {
    if (!clientId) {
      throw new Error('clientId is missing');
    }

    const permissionExists = permissionTemplateId || permissions;
    if (!permissionExists) {
      throw new Error('No permissions provided');
    }

    return !!(await validateSession());
  };

  return async (vehicles: Vehicle[]) => {
    if (!vehicles.length) {
      throw new Error('No vehicles shared');
    }
    const isValid = await validate();
    if (!isValid) throw new Error(INVALID_SESSION_ERROR);

    const perms = createPermissionsFromParams(permissions, permissionTemplateId);
    const attachments = generateAttachments(region?.toUpperCase());
    const cloudEventAgreements = toCloudEventAgreements(cloudEvent);
    const grant = {
      grantee: clientId as `0x${string}`,
      permissions: perms,
      expiration: expirationDate,
    };
    const signSource = (asset?: `did:${string}`) =>
      generateIpfsSources(perms, clientId, expirationDate, {
        attachments,
        cloudEventAgreements,
        asset,
      });

    // File agreements only count for the vehicle DID they name, so a share
    // with files needs a document per vehicle. Without files, one document
    // covers the whole batch.
    if (cloudEventAgreements.length || vehicles.length === 1) {
      const withFiles = cloudEventAgreements.length > 0;
      // Sign every document before sending anything, so a signing failure
      // leaves no grants behind.
      const grants = await Promise.all(
        vehicles.map(async (vehicle) => ({
          ...grant,
          tokenId: BigInt(vehicle.tokenId),
          source: await signSource(getVehicleAsset(vehicle, withFiles)),
        })),
      );
      if (grants.length === 1) {
        await setVehiclePermissions(grants[0]);
        return;
      }
      // One user operation per batch: all of a batch's grants land or none do.
      // Only shares of more than 24 vehicles need a second batch.
      for (let i = 0; i < grants.length; i += VEHICLE_PERMISSIONS_BATCH_LIMIT) {
        await setVehiclePermissionsBatch(
          grants.slice(i, i + VEHICLE_PERMISSIONS_BATCH_LIMIT),
        );
      }
      return;
    }

    const source = await signSource();
    await setVehiclePermissionsBulk({
      ...grant,
      tokenIds: vehicles.map((v) => BigInt(v.tokenId)),
      source,
    });
  };
};
