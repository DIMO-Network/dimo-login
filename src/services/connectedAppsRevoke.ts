/**
 * connectedAppsRevoke.ts
 *
 * "Stop sharing" on the connected-apps page: ends every grant the account made
 * to one app, signed by the account's wallet. It reaches the wallet stack
 * (turnkeyService), so only the connected-apps screen, which loads lazily,
 * imports it.
 */
import {
  getPermissionsArray,
  type SetVehiclePermissions,
} from '@dimo-network/transactions';

import type { AppAccess } from '../hooks/useConnectedApps';
import { fetchAccountGrants } from './grantsService';
import {
  generateAccountIpfsSource,
  generateIpfsSources,
  setAccountPermissions,
  setVehiclePermissionsBatch,
  VEHICLE_PERMISSIONS_BATCH_LIMIT,
} from './turnkeyService';
import { getVehicleAsset } from './vehicleDocumentAgreements';

// An expiry of 0 ends a grant, as the share screen's Stop sharing signs it.
const ENDED = BigInt(0);

const chunks = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

/**
 * Ends the app's access: each vehicle grant re-signed with an expiry of 0, at
 * most VEHICLE_PERMISSIONS_BATCH_LIMIT to a user operation, then the grant on
 * the account (its documents) the same way. Each grant keeps its permissions;
 * only the expiry changes.
 *
 * That an expiry of 0 ends an account grant isn't confirmed, so after it is
 * sent the account's grants are read back, and this rejects while the app's
 * grant is still in force: the caller says it failed, never that it worked.
 * Any failure rejects; batches sent before it stay sent.
 */
export const revokeAppAccess = async (owner: string, app: AppAccess): Promise<void> => {
  const { grantee } = app;

  const vehicleGrants: SetVehiclePermissions[] = [];
  for (const vehicle of app.vehicles) {
    const permissions = getPermissionsArray(BigInt(vehicle.grant.permissions));
    const source = await generateIpfsSources(permissions, grantee, ENDED, {
      asset: getVehicleAsset(vehicle, false),
    });
    vehicleGrants.push({
      tokenId: BigInt(vehicle.tokenId),
      grantee,
      permissions,
      expiration: ENDED,
      source,
    });
  }
  for (const batch of chunks(vehicleGrants, VEHICLE_PERMISSIONS_BATCH_LIMIT)) {
    await setVehiclePermissionsBatch(batch);
  }

  if (!app.documents) return;
  const permissions = getPermissionsArray(BigInt(app.documents.permissions));
  const source = await generateAccountIpfsSource(permissions, grantee, ENDED);
  await setAccountPermissions({
    grantee,
    permissions,
    expiration: ENDED,
    templateId: ENDED,
    source,
  });
  const now = Date.now();
  const stillInForce = (await fetchAccountGrants(owner)).some(
    (grant) =>
      grant.grantee.toLowerCase() === grantee && Date.parse(grant.expiresAt) > now,
  );
  if (stillInForce) {
    throw new Error('The account grant is still in force after it was ended');
  }
};
