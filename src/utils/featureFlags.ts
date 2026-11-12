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

/** Telling the accounts API about a first sign-in on this browser (signInNotice). */
export const signInNoticeEnabled = () => process.env.REACT_APP_SIGN_IN_NOTICE === 'true';

/**
 * Sending the Google/Apple token as proof of the email when that sign-up
 * creates the account (POST /account). Off, the request is the one the login
 * has always sent. The accounts API allows the Authorization header only from
 * its proof-of-email release on, so a login built with this on before that
 * release is live can't create accounts from Google or Apple at all.
 */
export const signUpProofEnabled = () => process.env.REACT_APP_SIGN_UP_PROOF === 'true';
