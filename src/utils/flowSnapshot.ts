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
 * same tab, and only a reference to it travels in `state`. The reference is
 * also what makes a return trusted: anyone can link here with their own `code`
 * and `state`, but only this tab knows a reference it saved.
 */
import { filterMessageParams } from './messageParams';
import { reportRefusal } from './reportRefusal';

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
  window.crypto.getRandomValues(bytes);
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

/**
 * Saves the flow config and returns the reference to put in OAuth `state`.
 * Undefined when storage is blocked or full: the return couldn't be trusted,
 * so the caller doesn't leave.
 */
export const saveFlowSnapshot = (config: Record<string, unknown>): string | undefined => {
  try {
    const ref = createRef();
    sessionStorage.setItem(KEY_PREFIX + ref, JSON.stringify(config, replacer));
    return ref;
  } catch {
    reportRefusal('storage_blocked', {
      clientId: typeof config.clientId === 'string' ? config.clientId : undefined,
    });
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

/** The OAuth `state` in this page's URL, parsed; null when absent or not JSON. */
export const readOAuthState = (): Record<string, unknown> | null => {
  const raw = new URLSearchParams(window.location.search).get('state');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * An OAuth return this tab started: its `state` names a snapshot saved here
 * before leaving. Anything else is someone else's link, whose `code` would
 * sign the visitor in with the linker's Google account or attach the linker's
 * Tesla, so nothing from it is used.
 */
export const readTrustedOAuthReturn = (): {
  state: Record<string, unknown>;
  snapshot: Record<string, unknown>;
} | null => {
  const state = readOAuthState();
  const snapshot = state ? readFlowSnapshot(state.flowRef) : null;
  return state && snapshot ? { state, snapshot } : null;
};
