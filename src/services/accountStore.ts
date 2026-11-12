import type { UserObject } from '../models/user';
// Type-only: turnkeyService pulls in the wallet stack, which first-screen code must not load.
import type { TurnkeySessionDataWithExpiry } from './turnkeyService';
import {
  TurnkeySessionKey,
  clearLoggedEmail,
  clearSessionData,
  getLoggedEmail,
  getUserFromLocalStorage,
  storeUserInLocalStorage,
} from './storageService';
import { isValidEmail } from '../utils/emailUtils';

export type RememberedAccount = {
  email: string; // lowercased
  subOrganizationId?: string; // absent for an account known only from logged_email
  hasPasskey?: boolean;
  walletAddress?: `0x${string}` | null;
  smartContractAddress?: `0x${string}` | null;
  lastUsedAt: number; // ms
};

export const MAX_REMEMBERED_ACCOUNTS = 5;

const ACCOUNTS_KEY = 'dimo_accounts';
const walletSessionKey = (subOrganizationId: string) =>
  `${TurnkeySessionKey}_${subOrganizationId}`;
// storageService's per-app keys (<prefix><clientId>), which forgetAccount clears in every app.
const USER_DATA_PREFIX = 'user_data_';
const LOGGED_EMAIL_PREFIX = 'logged_email_';
const appOf = (key: string, prefix: string) => key.slice(prefix.length) as `0x${string}`;

/** Runs a storage write that may be blocked: then nothing is stored, nothing breaks. */
const quietly = (write: () => void): void => {
  try {
    write();
  } catch {
    // Storage blocked or full.
  }
};

const readJson = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void =>
  quietly(() => localStorage.setItem(key, JSON.stringify(value)));

const removeKey = (key: string): void => quietly(() => localStorage.removeItem(key));

/** Every key in localStorage, or none when it can't be read. */
const storageKeys = (): string[] => {
  try {
    return Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    ).filter((key): key is string => key !== null);
  } catch {
    return [];
  }
};

const sameEmail = (value: unknown, email: string) =>
  typeof value === 'string' && value.trim().toLowerCase() === email;

/**
 * The stored list, cleaned on the way in: entries with a usable email,
 * lowercased, one per email (the most recent), at most MAX_REMEMBERED_ACCOUNTS.
 * A hand-edited or half-written list reads as what it should be.
 */
// Loose on purpose: an account that signed in with Google or Apple never ran
// the sign-in email regex, and must not vanish from the chooser for it.
const isUsableEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+$/.test(email);

const readStoredAccounts = (): RememberedAccount[] => {
  const value = readJson(ACCOUNTS_KEY);
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is RememberedAccount =>
        typeof entry === 'object' && entry !== null && typeof entry.email === 'string',
    )
    .map((entry) => ({ ...entry, email: entry.email.trim().toLowerCase() }))
    .filter(
      (entry, i, all) =>
        isUsableEmail(entry.email) && all.findIndex((a) => a.email === entry.email) === i,
    )
    .slice(0, MAX_REMEMBERED_ACCOUNTS);
};

const readLoggedEmail = (clientId: `0x${string}` | null): string | null => {
  try {
    return getLoggedEmail(clientId);
  } catch {
    return null;
  }
};

const isSession = (value: unknown): value is TurnkeySessionDataWithExpiry =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as { sessionType?: unknown }).sessionType === 'string';

/**
 * Removes the wallet sessions nothing will use, since each holds a private key:
 * an account no longer listed (trimmed off, forgotten, or lost to two tabs
 * writing the list at once) and an email-code key past its expiry. A passkey
 * session holds no secret and is kept.
 */
const sweepWalletSessions = (stored: RememberedAccount[]): void => {
  // The subs of exactly what was just stored, not of the validated read.
  const listed = new Set(stored.map((a) => a.subOrganizationId));
  const prefix = walletSessionKey('');
  const now = Date.now();
  for (const key of storageKeys()) {
    if (!key.startsWith(prefix)) continue;
    const session = readJson(key);
    const expiredKey =
      isSession(session) && session.sessionType === 'api_key' && session.expiresAt < now;
    if (expiredKey || !listed.has(key.slice(prefix.length))) removeKey(key);
  }
};

export const getRememberedAccounts = (
  clientId: `0x${string}` | null,
): RememberedAccount[] => {
  const accounts = readStoredAccounts();
  // A browser upgraded from the build before this list knows this app's last
  // account only as logged_email_<clientId>, which seeds the list. Sign-in still
  // writes that key: the email-grant migration reads it.
  const logged = readLoggedEmail(clientId)?.trim().toLowerCase();
  if (logged && isValidEmail(logged) && !accounts.some((a) => a.email === logged)) {
    accounts.push({ email: logged, lastUsedAt: 0 });
  }
  return accounts.slice(0, MAX_REMEMBERED_ACCOUNTS);
};

export const rememberAccount = (user: UserObject, now: number = Date.now()): void => {
  const email = user.email.trim().toLowerCase();
  const entry: RememberedAccount = {
    email,
    subOrganizationId: user.subOrganizationId,
    hasPasskey: user.hasPasskey,
    walletAddress: user.walletAddress,
    smartContractAddress: user.smartContractAddress,
    lastUsedAt: now,
  };
  const others = readStoredAccounts().filter((a) => a.email !== email);
  const next = [entry, ...others].slice(0, MAX_REMEMBERED_ACCOUNTS);
  writeJson(ACCOUNTS_KEY, next);
  sweepWalletSessions(next);
};

/**
 * Removes the account from this device: from the list, its wallet session, and
 * every app on this browser signed in as it (token cookie, stored user, logged
 * email), so no app reopens as it or offers it again.
 */
export const forgetAccount = (email: string): void => {
  const target = email.trim().toLowerCase();
  const stored = readStoredAccounts();
  const remaining = stored.filter((a) => a.email !== target);
  writeJson(ACCOUNTS_KEY, remaining);
  const subOrganizationIds = stored
    .filter((a) => a.email === target)
    .map((a) => a.subOrganizationId);
  for (const key of storageKeys()) {
    if (key.startsWith(USER_DATA_PREFIX)) {
      const user = readJson(key) as Partial<UserObject> | null;
      if (sameEmail(user?.email, target)) {
        subOrganizationIds.push(user?.subOrganizationId);
        quietly(() => clearSessionData(appOf(key, USER_DATA_PREFIX)));
      }
    } else if (key.startsWith(LOGGED_EMAIL_PREFIX)) {
      const clientId = appOf(key, LOGGED_EMAIL_PREFIX);
      // clearLoggedEmail first moves an email answer stored before answers were
      // per account to the account it belonged to.
      if (sameEmail(readLoggedEmail(clientId), target)) {
        quietly(() => clearLoggedEmail(clientId));
      }
    }
  }
  subOrganizationIds.forEach((subOrganizationId) => endWalletSession(subOrganizationId));
  sweepWalletSessions(remaining);
};

/**
 * The apps signed in as this account on this browser: each one whose stored
 * user (user_data_<clientId>) has the email, compared ignoring case.
 */
export const listAppsSignedInAs = (email: string): `0x${string}`[] => {
  const target = email.trim().toLowerCase();
  return storageKeys()
    .filter((key) => key.startsWith(USER_DATA_PREFIX))
    .filter((key) => {
      const user = readJson(key) as Partial<UserObject> | null;
      return sameEmail(user?.email, target);
    })
    .map((key) => appOf(key, USER_DATA_PREFIX));
};

/**
 * Signs one app out of the login on this browser (its token and stored user),
 * as "Use another account" does. The account stays remembered, its wallet
 * session too, and the app's own copy of the token is untouched.
 */
export const signOutAppHere = (clientId: `0x${string}`): void =>
  quietly(() => clearSessionData(clientId));

/**
 * The account an app was last signed in as on this browser: its stored user,
 * or, once "Use another account" removed that, the remembered account its
 * logged email names.
 */
export const getLastSignedInSubOrganizationId = (
  clientId: `0x${string}` | null,
): string | undefined => {
  try {
    const signedIn = getUserFromLocalStorage(clientId)?.subOrganizationId;
    if (signedIn) return signedIn;
  } catch {
    // Unreadable stored user: the logged email may still name the account.
  }
  const logged = readLoggedEmail(clientId)?.trim().toLowerCase();
  if (!logged) return undefined;
  return readStoredAccounts().find((a) => a.email === logged)?.subOrganizationId;
};

/**
 * The account now has a passkey: so says this app's stored user (when it is
 * this account) and the remembered account. Only the fields each keeps are
 * written. Never throws.
 */
export const markHasPasskey = (
  clientId: `0x${string}` | null,
  account: UserObject,
): void => {
  const email = account.email.trim().toLowerCase();
  quietly(() => {
    const stored = getUserFromLocalStorage(clientId);
    if (stored && sameEmail(stored.email, email)) {
      storeUserInLocalStorage(clientId, { ...stored, hasPasskey: true });
    }
  });
  quietly(() => rememberAccount({ ...account, hasPasskey: true }));
};

// "Not now" on the passkey offer, per account: when it was said (ms).
const passkeyOfferKey = (subOrganizationId: string) =>
  `dimo_passkey_offer_${subOrganizationId}`;
const PASSKEY_OFFER_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/** Don't offer this account a passkey on this browser for 30 days. */
export const snoozePasskeyOffer = (subOrganizationId: string, now = Date.now()): void =>
  writeJson(passkeyOfferKey(subOrganizationId), now);

export const isPasskeyOfferSnoozed = (
  subOrganizationId: string,
  now = Date.now(),
): boolean => {
  const snoozedAt = readJson(passkeyOfferKey(subOrganizationId));
  return typeof snoozedAt === 'number' && now - snoozedAt < PASSKEY_OFFER_SNOOZE_MS;
};

export const getWalletSession = (
  subOrganizationId: string,
): TurnkeySessionDataWithExpiry | null => {
  const session = readJson(walletSessionKey(subOrganizationId));
  return isSession(session) ? session : null;
};

export const setWalletSession = (
  subOrganizationId: string,
  data: TurnkeySessionDataWithExpiry,
): void => {
  writeJson(walletSessionKey(subOrganizationId), data);
  // The single session an older build stored is never read; this one replaces it.
  removeKey(TurnkeySessionKey);
};

export const clearWalletSession = (subOrganizationId: string): void =>
  removeKey(walletSessionKey(subOrganizationId));

/** Ends an account's wallet session on this device, and any an older build left. Never throws. */
export const endWalletSession = (subOrganizationId?: string): void => {
  if (subOrganizationId) clearWalletSession(subOrganizationId);
  removeKey(TurnkeySessionKey);
};
