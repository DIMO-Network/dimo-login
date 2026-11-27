/**
 * The current Turnkey session's API-key stamper, kept in module memory only:
 * never written to localStorage, sessionStorage or IndexedDB. An email-code
 * sign-in and a passkey sign-in (with ACCOUNTS_V2_SENDS on) both end up here,
 * so the accounts v2 send path signs with the one session the wallet signer
 * uses. It stays out of turnkeyService so the main bundle (logout) can clear it
 * without loading the wallet stack.
 */
import type { ApiKeyStamper } from '@turnkey/api-key-stamper';

/**
 * A v2 send takes up to 30 s and its receipt wait up to 120 s, so a session
 * (dauth and Turnkey both) with less than this left isn't used for one; with
 * ACCOUNTS_V2_SENDS on, validateSession renews a passkey session that has less.
 */
export const SEND_MARGIN_MS = 180_000;

type Session = {
  stamper: ApiKeyStamper;
  expiresAt: number;
  /** The account, when a flagged passkey sign-in opened this session. */
  passkeySub: string | null;
};

let session: Session | null = null;
// Bumped whenever the session is cleared (reset, logout), so work that began
// before then can tell it is stale and open nothing.
let generation = 0;

/** The current session's stamper, or null when there is none or it has expired. */
export const getSessionStamper = (): ApiKeyStamper | null =>
  session && session.expiresAt > Date.now() ? session.stamper : null;

/** When the current session expires (ms since the epoch), live or lapsed; null without one. */
export const getSessionStamperExpiry = (): number | null => session?.expiresAt ?? null;

/** The account of a flagged passkey session, live or lapsed; null otherwise. */
export const getPasskeySessionSub = (): string | null => session?.passkeySub ?? null;

export const sessionGeneration = (): number => generation;

export const setSessionStamper = (
  stamper: ApiKeyStamper,
  expiresAt: number,
  passkeySub: string | null = null,
): void => {
  session = { stamper, expiresAt, passkeySub };
};

export const clearSessionStamper = (): void => {
  session = null;
  generation += 1;
};
