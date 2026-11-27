/**
 * The current Turnkey session's API-key stamper, kept in module memory only:
 * never written to localStorage, sessionStorage or IndexedDB. An email-code
 * sign-in and a passkey sign-in (with ACCOUNTS_V2_SENDS on) both end up here,
 * so the accounts v2 send path signs with the one session the wallet signer
 * uses. It stays out of turnkeyService so the main bundle (logout) can clear it
 * without loading the wallet stack.
 */
import type { ApiKeyStamper } from '@turnkey/api-key-stamper';

let sessionStamper: ApiKeyStamper | null = null;

export const getSessionStamper = (): ApiKeyStamper | null => sessionStamper;

export const setSessionStamper = (stamper: ApiKeyStamper): void => {
  sessionStamper = stamper;
};

export const clearSessionStamper = (): void => {
  sessionStamper = null;
};
