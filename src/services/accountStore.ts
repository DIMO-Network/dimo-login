import type { UserObject } from '../models/user';
// Type-only: turnkeyService pulls in the wallet stack, which first-screen code must not load.
import type { TurnkeySessionDataWithExpiry } from './turnkeyService';
import {
  TurnkeySessionKey,
  clearLoggedEmail,
  getLoggedEmail,
  getUserFromLocalStorage,
} from './storageService';

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

const readJson = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: nothing remembered, nothing broken.
  }
};

const removeKey = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage blocked.
  }
};

const readStoredAccounts = (): RememberedAccount[] => {
  const value = readJson(ACCOUNTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is RememberedAccount =>
      typeof entry === 'object' && entry !== null && typeof entry.email === 'string',
  );
};

const readLoggedEmail = (clientId: `0x${string}` | null): string | null => {
  try {
    return getLoggedEmail(clientId);
  } catch {
    return null;
  }
};

export const getRememberedAccounts = (
  clientId: `0x${string}` | null,
): RememberedAccount[] => {
  const accounts = readStoredAccounts();
  const logged = readLoggedEmail(clientId)?.trim().toLowerCase();
  if (logged && !accounts.some((a) => a.email.toLowerCase() === logged)) {
    accounts.push({ email: logged, lastUsedAt: 0 });
  }
  return accounts;
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
  const others = readStoredAccounts().filter((a) => a.email.toLowerCase() !== email);
  writeJson(ACCOUNTS_KEY, [entry, ...others].slice(0, MAX_REMEMBERED_ACCOUNTS));
};

export const forgetAccount = (email: string, clientId: `0x${string}` | null): void => {
  const target = email.trim().toLowerCase();
  const stored = readStoredAccounts();
  const removed = stored.filter((a) => a.email.toLowerCase() === target);
  writeJson(
    ACCOUNTS_KEY,
    stored.filter((a) => a.email.toLowerCase() !== target),
  );
  removed.forEach((a) => {
    if (a.subOrganizationId) removeKey(walletSessionKey(a.subOrganizationId));
  });
  if (readLoggedEmail(clientId)?.trim().toLowerCase() === target) {
    try {
      clearLoggedEmail(clientId);
    } catch {
      // Storage blocked.
    }
  }
};

export const getWalletSession = (
  subOrganizationId: string,
  clientId: `0x${string}` | null,
): TurnkeySessionDataWithExpiry | null => {
  const own = readJson(walletSessionKey(subOrganizationId));
  if (own && typeof own === 'object') return own as TurnkeySessionDataWithExpiry;

  // One-time migration of the single global session an older build stored.
  const legacy = readJson(TurnkeySessionKey);
  if (!legacy || typeof legacy !== 'object') return null;
  let signedInAs: UserObject | null = null;
  try {
    signedInAs = getUserFromLocalStorage(clientId);
  } catch {
    return null;
  }
  if (signedInAs?.subOrganizationId !== subOrganizationId) return null;
  writeJson(walletSessionKey(subOrganizationId), legacy);
  removeKey(TurnkeySessionKey);
  return legacy as TurnkeySessionDataWithExpiry;
};

export const setWalletSession = (
  subOrganizationId: string,
  data: TurnkeySessionDataWithExpiry,
): void => writeJson(walletSessionKey(subOrganizationId), data);

export const clearWalletSession = (subOrganizationId: string): void =>
  removeKey(walletSessionKey(subOrganizationId));
