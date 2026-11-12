/**
 * Features that ship dark. Each is on only when its variable is set to exactly
 * `true` at build time (see README). Every flag is read as the literal
 * `process.env.REACT_APP_*` the build inlines, on each call, so tests can set it.
 */

/** The connected-apps page (`entryState=CONNECTED_APPS`). */
export const connectedAppsEnabled = () => process.env.REACT_APP_CONNECTED_APPS === 'true';
