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
  mergeAgreements,
  readGrantAgreements,
  toCloudEventAgreements,
  withSource,
} from '../services/vehicleDocumentAgreements';
import { mergePermissions } from '../utils/permissions';
import { mapWithConcurrency } from '../utils/mapWithConcurrency';

// Documents are signed (Turnkey) and uploaded (IPFS) per vehicle; cap the burst.
const SIGNING_CONCURRENCY = 4;

export const useShareVehicles = () => {
  const {
    clientId,
    expirationDate,
    permissionTemplateId,
    permissions,
    region,
    cloudEvent,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { validateSession, user } = useAuthContext();

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
    const requestedAgreements = withSource(
      toCloudEventAgreements(cloudEvent),
      user?.smartContractAddress,
    );
    const grant = {
      grantee: clientId as `0x${string}`,
      expiration: expirationDate,
    };

    // A vehicle already shared with this app gets its current grant plus the
    // request, so an update never drops access (only "Stop sharing" does). If
    // its grant can't be read, readGrantAgreements throws and nothing is sent.
    const buildGrant = async (vehicle: Vehicle) => {
      const existing = vehicle.shared ? await readGrantAgreements(vehicle) : [];
      const agreements = mergeAgreements(existing, requestedAgreements);
      const vehiclePerms = vehicle.shared
        ? mergePermissions(vehicle.permissions, perms)
        : perms;
      const source = await generateIpfsSources(vehiclePerms, clientId, expirationDate, {
        attachments,
        cloudEventAgreements: agreements,
        asset: getVehicleAsset(vehicle, agreements.length > 0),
      });
      return {
        ...grant,
        permissions: vehiclePerms,
        tokenId: BigInt(vehicle.tokenId),
        source,
      };
    };

    // File agreements only count for the vehicle DID they name, and updates
    // carry each vehicle's own grant, so both need a document per vehicle.
    // A plain first-time share of several vehicles uses one bulk document.
    const perVehicle =
      requestedAgreements.length > 0 ||
      vehicles.length === 1 ||
      vehicles.some((v) => v.shared);

    if (perVehicle) {
      // Sign every document before sending anything, so a signing failure
      // leaves no grants behind.
      const grants = await mapWithConcurrency(vehicles, SIGNING_CONCURRENCY, buildGrant);
      if (grants.length === 1) {
        await setVehiclePermissions(grants[0]);
        return;
      }
      // Each batch is one user operation, so its grants land together or not
      // at all. Shares of more than 24 vehicles need several batches, and an
      // error partway leaves the earlier batches in place.
      for (let i = 0; i < grants.length; i += VEHICLE_PERMISSIONS_BATCH_LIMIT) {
        await setVehiclePermissionsBatch(
          grants.slice(i, i + VEHICLE_PERMISSIONS_BATCH_LIMIT),
        );
      }
      return;
    }

    const source = await generateIpfsSources(perms, clientId, expirationDate, {
      attachments,
    });
    await setVehiclePermissionsBulk({
      ...grant,
      permissions: perms,
      tokenIds: vehicles.map((v) => BigInt(v.tokenId)),
      source,
    });
  };
};
