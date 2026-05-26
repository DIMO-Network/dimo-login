/**
 * messageParams.ts
 *
 * Defense-in-depth schema enforcement for inbound SDK postMessage payloads.
 *
 * `handleAuthInitMessage` receives `event.data` from the relying party and
 * spreads it into `devCredentialsState`. Without filtering, any sender could
 * write arbitrary keys — including internal control flags (`waitingForDevLicense`,
 * `invalidCredentials`) or the resolved `oemBrand` record — straight into state,
 * bypassing the values the app computes itself.
 *
 * This allowlist pins the inbound message to the keys the app actually acts on:
 * the `specialSetters` in `useParamsHandler` plus the generic param fields in
 * `types/params.ts`. Internal/computed fields (`waitingForParams`,
 * `waitingForDevLicense`, `invalidCredentials`, `devLicenseAlias`, `oemBrand`)
 * are deliberately excluded — they are never accepted from the wire.
 */

export const ALLOWED_MESSAGE_PARAM_KEYS = new Set<string>([
  // Identity / routing
  'clientId',
  'redirectUri',
  'apiKey',
  'utm',
  'configCID',
  'entryState',
  'brandName',
  // UI behavior
  'altTitle',
  'forceEmail',
  'newVehicleSectionDescription',
  'shareVehiclesSectionDescription',
  // Vehicle sharing flow
  'permissionTemplateId',
  'permissions',
  'vehicles',
  'vehicleTokenIds',
  'vehicleMakes',
  'powertrainTypes',
  'expirationDate',
  'region',
  'onboarding',
  'cloudEvent',
  // Advanced transaction / sign message flows
  'transactionData',
  'messageData',
]);

/**
 * Returns a copy of `params` containing only allowlisted keys. Unknown keys and
 * internal control flags are dropped.
 */
export function filterMessageParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([key]) => ALLOWED_MESSAGE_PARAM_KEYS.has(key)),
  );
}
