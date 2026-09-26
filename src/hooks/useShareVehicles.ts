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
  GrantUnreadableError,
  mergeAgreements,
  readGrantAgreements,
  toCloudEventAgreements,
  withSource,
} from '../services/vehicleDocumentAgreements';
import { mergePermissions } from '../utils/permissions';
import { keepLaterExpiration } from '../utils/vehicles';
import { mapWithConcurrency } from '../utils/mapWithConcurrency';

export interface ShareResult {
  shared: Vehicle[];
  // Already-shared vehicles left exactly as they were, because their current
  // grant couldn't be read or carried over in full.
  skipped: { vehicle: Vehicle; reason: string }[];
}

// Grants are read (IPFS) and documents signed (Turnkey) and uploaded (IPFS)
// per vehicle; cap the burst.
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

  return async (vehicles: Vehicle[]): Promise<ShareResult> => {
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

    // A vehicle already shared with this app gets its current grant plus the
    // request, so an update never drops access (only "Stop sharing" does):
    // same or more permissions and files, and the later expiry. Every current
    // grant is read and checked before anything is signed. One that can't be
    // carried over is left as it is and skipped, so it never blocks sharing
    // the other vehicles.
    const planGrant = async (vehicle: Vehicle) => {
      const plan = vehicle.shared
        ? {
            permissions: mergePermissions(vehicle, perms),
            agreements: mergeAgreements(
              await readGrantAgreements(vehicle, {
                grantor: user?.smartContractAddress,
                grantee: clientId,
              }),
              requestedAgreements,
            ),
            expiration: keepLaterExpiration(vehicle, expirationDate),
          }
        : {
            permissions: perms,
            agreements: requestedAgreements,
            expiration: expirationDate,
          };
      return {
        ...plan,
        vehicle,
        // Also checked up front: a vehicle without a DID can't take files.
        asset: getVehicleAsset(vehicle, plan.agreements.length > 0),
      };
    };

    const signGrant = async ({
      vehicle,
      permissions: vehiclePerms,
      agreements,
      expiration,
      asset,
    }: Awaited<ReturnType<typeof planGrant>>) => ({
      grantee: clientId as `0x${string}`,
      permissions: vehiclePerms,
      expiration,
      tokenId: BigInt(vehicle.tokenId),
      source: await generateIpfsSources(vehiclePerms, clientId, expiration, {
        attachments,
        cloudEventAgreements: agreements,
        asset,
      }),
    });

    // File agreements only count for the vehicle DID they name, and updates
    // carry each vehicle's own grant, so both need a document per vehicle.
    // A plain first-time share of several vehicles uses one bulk document.
    const perVehicle =
      requestedAgreements.length > 0 ||
      vehicles.length === 1 ||
      vehicles.some((v) => v.shared);

    if (perVehicle) {
      const planned = await mapWithConcurrency(
        vehicles,
        SIGNING_CONCURRENCY,
        async (vehicle) => {
          try {
            return { plan: await planGrant(vehicle), skip: undefined, error: undefined };
          } catch (error) {
            if (vehicle.shared && error instanceof GrantUnreadableError) {
              return { plan: undefined, skip: { vehicle, reason: error.message }, error };
            }
            throw error;
          }
        },
      );
      const plans = planned.flatMap((p) => (p.plan ? [p.plan] : []));
      const skipped = planned.flatMap((p) => (p.skip ? [p.skip] : []));
      // Nothing left to share: report why, as before.
      if (!plans.length) throw planned[0].error;
      const result = { shared: plans.map((p) => p.vehicle), skipped };

      // Sign every document before sending anything, so a signing failure
      // leaves no grants on-chain. Signings already running when one fails
      // still finish; their documents are uploaded but never referenced.
      const grants = await mapWithConcurrency(plans, SIGNING_CONCURRENCY, signGrant);
      if (grants.length === 1) {
        await setVehiclePermissions(grants[0]);
        return result;
      }
      // Each batch is one user operation, so its grants land together or not
      // at all. Shares of more than 24 vehicles need several batches, and an
      // error partway leaves the earlier batches in place.
      for (let i = 0; i < grants.length; i += VEHICLE_PERMISSIONS_BATCH_LIMIT) {
        await setVehiclePermissionsBatch(
          grants.slice(i, i + VEHICLE_PERMISSIONS_BATCH_LIMIT),
        );
      }
      return result;
    }

    const source = await generateIpfsSources(perms, clientId, expirationDate, {
      attachments,
    });
    await setVehiclePermissionsBulk({
      grantee: clientId as `0x${string}`,
      expiration: expirationDate,
      permissions: perms,
      tokenIds: vehicles.map((v) => BigInt(v.tokenId)),
      source,
    });
    return { shared: vehicles, skipped: [] };
  };
};
