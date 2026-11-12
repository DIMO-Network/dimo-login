/**
 * Features that ship dark. Each is on only when its variable is set to exactly
 * `true` at build time (see README). Every flag is read as the literal
 * `process.env.REACT_APP_*` the build inlines, on each call, so tests can set it.
 */

/** The connected-apps page (`entryState=CONNECTED_APPS`). */
export const connectedAppsEnabled = () => process.env.REACT_APP_CONNECTED_APPS === 'true';

/** The offer to add a passkey after an email-code sign-in (PASSKEY_OFFER). */
export const passkeyOfferEnabled = () => process.env.REACT_APP_PASSKEY_OFFER === 'true';

/** "Sign in with a passkey" on the email form, without typing an email. */
export const passkeyFirstEnabled = () => process.env.REACT_APP_PASSKEY_FIRST === 'true';
