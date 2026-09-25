import { Vehicle } from '../models/vehicle';
import {
  createPermissionsFromParams,
  generateIpfsSources,
  setVehiclePermissions,
  setVehiclePermissionsBulk,
} from '../services';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { INVALID_SESSION_ERROR } from '../utils/authUtils';
import { generateAttachments } from '../services/permissionsService';
import { toCloudEventAgreements } from '../services/vehicleDocumentAgreements';

export const toVehicleAsset = (vehicle: Vehicle) =>
  vehicle.tokenDID ? (vehicle.tokenDID as `did:${string}`) : undefined;

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
    // with files signs a document per vehicle and sets each grant on its own.
    // Without files, one document covers the whole batch.
    if (cloudEventAgreements.length || vehicles.length === 1) {
      for (const vehicle of vehicles) {
        const source = await signSource(toVehicleAsset(vehicle));
        await setVehiclePermissions({
          ...grant,
          tokenId: BigInt(vehicle.tokenId),
          source,
        });
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
