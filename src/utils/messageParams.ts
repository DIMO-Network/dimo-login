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
 *
 * Verified against the login-with-dimo SDK (sdk/src/utils/eventHandler.ts):
 *   AUTH_INIT message → clientId, redirectUri, apiKey, entryState, forceEmail,
 *                       brandName, altTitle
 *   action message    → DimoActionPayload: permissionTemplateId, vehicles,
 *                       vehicleMakes, onboarding, expirationDate, utm,
 *                       powertrainTypes, permissions, transactionData, messageData
 * Every SDK-sent key is covered below. The remaining keys (configCID, region,
 * cloudEvent, vehicleTokenIds, *SectionDescription) are app-side params from the
 * config-CID/configurationId flows or special-setter aliases (vehicles →
 * vehicleTokenIds), not sent over postMessage but kept as legitimate state.
 */

export const ALLOWED_MESSAGE_PARAM_KEYS = new Set<string>([
  // Identity / routing  (SDK AUTH_INIT: clientId, redirectUri, apiKey, entryState)
  'clientId',
  'redirectUri',
  'apiKey',
  'utm',
  'configCID',
  'entryState',
  'brandName',
  // UI behavior  (SDK AUTH_INIT: altTitle, forceEmail, tosUrl, privacyPolicyUrl)
  'altTitle',
  'forceEmail',
  'tosUrl',
  'privacyPolicyUrl',
  'newVehicleSectionDescription',
  'shareVehiclesSectionDescription',
  // Vehicle sharing flow  (SDK action payload)
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
  // Advanced transaction / sign message flows  (SDK action payload)
  'transactionData',
  'messageData',
  // Developer license provisioning flow (key rotation)
  'existingTokenId',
  'existingClientId',
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
