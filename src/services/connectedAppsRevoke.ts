/**
 * connectedAppsRevoke.ts
 *
 * "Stop sharing" on the connected-apps page: ends every grant the account made
 * to one app, signed by the account's wallet, then waits for identity-api's
 * index to show it. It reaches the wallet stack (turnkeyService), so only the
 * connected-apps screen, which loads lazily, imports it.
 */
import {
  getPermissionsArray,
  type SetVehiclePermissions,
} from '@dimo-network/transactions';

import type { AppAccess } from '../hooks/useConnectedApps';
import { fetchAccountGrants, fetchVehiclesStillGranted } from './grantsService';
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

// The index follows the chain by seconds: look every 2 s, for up to a minute.
export const REVOCATION_POLL_MS = 2_000;
export const REVOCATION_WAIT_MS = 60_000;

const chunks = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

/** Waits `ms`, or less when `signal` aborts. */
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done);
  });

/**
 * Ends the app's access: each vehicle grant re-signed with an expiry of 0, at
 * most VEHICLE_PERMISSIONS_BATCH_LIMIT to a user operation, then the grant on
 * the account (its documents) the same way. Each grant keeps its permissions;
 * only the expiry changes. Resolves once every user operation has landed;
 * any failure rejects, and batches sent before it stay sent. Whether the
 * grants show as ended is waitForRevocation's to say.
 */
export const revokeAppAccess = async (app: AppAccess): Promise<void> => {
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
};

/** Whether the index shows none of the app's grants (that the page listed) in force. */
const revocationIndexed = async (owner: string, app: AppAccess): Promise<boolean> => {
  const now = Date.now();
  const [vehicles, accountGrants] = await Promise.all([
    app.vehicles.length > 0
      ? fetchVehiclesStillGranted(
          app.vehicles.map((vehicle) => vehicle.tokenId),
          app.grantee,
        )
      : [],
    app.documents ? fetchAccountGrants(owner) : [],
  ]);
  return (
    vehicles.length === 0 &&
    !accountGrants.some(
      (grant) =>
        grant.grantee.toLowerCase() === app.grantee && Date.parse(grant.expiresAt) > now,
    )
  );
};

/**
 * After revokeAppAccess: reads the app's grants back from the index every
 * REVOCATION_POLL_MS until none is in force (true), or REVOCATION_WAIT_MS has
 * passed (false: not shown yet, which isn't a failure). A read that fails
 * counts as not yet. An expiry of 0 ending an account grant is checked here
 * too, since it isn't otherwise confirmed. Aborting `signal` (the page
 * going) stops it, resolving false.
 */
export const waitForRevocation = async (
  owner: string,
  app: AppAccess,
  signal?: AbortSignal,
): Promise<boolean> => {
  const deadline = Date.now() + REVOCATION_WAIT_MS;
  for (;;) {
    if (signal?.aborted) return false;
    const indexed = await revocationIndexed(owner, app).catch(() => false);
    if (indexed) return true;
    if (signal?.aborted || Date.now() + REVOCATION_POLL_MS > deadline) return false;
    await sleep(REVOCATION_POLL_MS, signal);
  }
};
