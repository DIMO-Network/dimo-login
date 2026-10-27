/**
 * flowSnapshot.ts
 *
 * Google, Apple and Tesla sign-in leave login.dimo.org and come back with only
 * `code` and `state` in the URL. In popup mode, and for configurationId /
 * configCID links, the flow's config (entry state, permissions, vehicles,
 * documents, transaction data) never was in the URL, so the round-trip used to
 * drop it and a share started with Google came back as a plain login.
 *
 * The config is saved to sessionStorage, which survives the round-trip in the
 * same tab, and only a reference to it travels in `state`.
 */
import { filterMessageParams } from './messageParams';

const KEY_PREFIX = 'dimo_login_flow_';
const REF_PATTERN = /^[a-f0-9]{16,64}$/;

// transactionData can carry bigint values: postMessage keeps them, JSON does not.
const BIGINT_TAG = '__dimo_bigint__';

const replacer = (_key: string, value: unknown) =>
  typeof value === 'bigint' ? { [BIGINT_TAG]: value.toString() } : value;

const reviver = (_key: string, value: unknown) => {
  if (value && typeof value === 'object') {
    const tagged = (value as Record<string, unknown>)[BIGINT_TAG];
    if (typeof tagged === 'string' && Object.keys(value).length === 1) {
      return BigInt(tagged);
    }
  }
  return value;
};

const createRef = (): string => {
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

// State holds the expiration as unix seconds; the expirationDate setter parses
// an ISO date, and reads a bare number as invalid (falling back to the default).
const toIsoDate = (seconds: unknown): string | undefined => {
  const ms = Number(String(seconds)) * 1000;
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : undefined;
};

export const buildFlowSnapshot = ({
  devCredentials,
  entryState,
  onboardingEnabled,
}: {
  devCredentials: object;
  entryState: string;
  onboardingEnabled: boolean;
}): Record<string, unknown> => {
  const { expirationDate, ...params } = filterMessageParams(
    devCredentials as Record<string, unknown>,
  );
  return {
    ...params,
    entryState,
    onboarding: onboardingEnabled ? ['tesla'] : [],
    expirationDate: toIsoDate(expirationDate),
  };
};

/** Saves the flow config and returns the reference to put in OAuth `state`. */
export const saveFlowSnapshot = (config: Record<string, unknown>): string | undefined => {
  try {
    const ref = createRef();
    sessionStorage.setItem(KEY_PREFIX + ref, JSON.stringify(config, replacer));
    return ref;
  } catch {
    // Storage blocked or full: the round-trip falls back to a plain login.
    return undefined;
  }
};

/**
 * Reads a saved flow config, allowlisted like an SDK message. Kept in storage,
 * not removed, so reloading the return URL restores the same flow.
 */
export const readFlowSnapshot = (ref: unknown): Record<string, unknown> | null => {
  if (typeof ref !== 'string' || !REF_PATTERN.test(ref)) return null;
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + ref);
    if (!raw) return null;
    const parsed = JSON.parse(raw, reviver);
    return parsed && typeof parsed === 'object' ? filterMessageParams(parsed) : null;
  } catch {
    return null;
  }
};
