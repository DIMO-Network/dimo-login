/**
 * signInNotice.ts
 *
 * Tells the accounts API that an account signed in on a browser it hasn't
 * been used on here before, so it can email the account (it decides, and
 * de-duplicates by this browser's key). A courtesy, not a control: nothing
 * waits on it and nothing about it is shown. First-screen safe: native APIs
 * only.
 */
import { i18n } from '../i18n/instance';
import { normalizeLanguage } from '../i18n/language';
import { bytesToBase64Url } from '../utils/base64url';

const DIMO_ACCOUNTS_BASE_URL =
  process.env.REACT_APP_DIMO_ACCOUNTS_URL || 'https://accounts.dev.dimo.org/api';

const DEVICE_KEY = 'dimo_device_key';
// 24 random bytes; the accounts API takes 16 to 48.
const DEVICE_KEY_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/** This browser's random key, made once; null when storage is blocked. */
export const getDeviceKey = (): string | null => {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored && DEVICE_KEY_PATTERN.test(stored)) return stored;
    const key = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
    localStorage.setItem(DEVICE_KEY, key);
    return key;
  } catch {
    return null;
  }
};

/**
 * Posts the notice with the token the sign-in just made (the accounts API
 * accepts only a fresh one). Without a key that lasts, every sign-in would
 * look new, so then nothing is sent. Never throws.
 */
export const sendSignInNotice = (token: string): void => {
  const deviceKey = getDeviceKey();
  if (!deviceKey) return;
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/sign-in-notice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ deviceKey, ...(language && { language }) }),
    keepalive: true,
  }).catch(() => {});
};
