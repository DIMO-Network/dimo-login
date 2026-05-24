/**
 * brandService.ts
 *
 * Fetches the OEM brand record for a given dev license `clientId` from
 * dev-console-api. The popup uses this to render OEM-branded chrome
 * (logo, title, document.title) — canonical, trust-anchored on the
 * dimo.org side rather than relying on params sent through the SDK.
 *
 *   GET https://console-api.dimo.org/api/brand?clientId=0xb92d74…
 *     200 { name, logoCid, iconCid, logoUrl, iconUrl, updatedAt }
 *     404 { error: 'not_found' }
 *
 * Errors and 404s resolve to `null`; the popup falls back to the
 * default DIMO chrome. Auth must never block on a brand lookup.
 */

export interface OemBrand {
  /** OEM display name (e.g. "Toyota"). */
  name: string;
  /** Wide brand mark — resolved HTTPS URL ready to drop into <img src>. */
  logoUrl: string | null;
  /** Square icon — resolved HTTPS URL ready to drop into <img src>. */
  iconUrl: string | null;
  /** 7-char hex (#RRGGBB) or null. Drives popup CTA + focus-ring color. */
  primaryColor: string | null;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const PROD_BASE = 'https://console-api.dimo.org';
const DEV_BASE = 'https://console-api.dev.dimo.org';

function consoleApiBase(): string {
  return process.env.REACT_APP_DIMO_CONSOLE_API_URL
    || (process.env.REACT_APP_ENVIRONMENT === 'prod' ? PROD_BASE : DEV_BASE);
}

interface BrandResponse {
  name?: string | null;
  logoCid?: string | null;
  iconCid?: string | null;
  logoUrl?: string | null;
  iconUrl?: string | null;
  primaryColor?: string | null;
}

const FETCH_TIMEOUT_MS = 3000;

// The brand is keyed on the public `clientId`, so caching it client-side is
// safe (no secrets) and lets the popup paint the OEM logo on the very first
// frame of a return visit — eliminating the flash of the default DIMO mark
// while `fetchOemBrand` is in flight during the "Waiting for credentials…"
// loading window. The live fetch always runs and overwrites the cache, so
// staleness is bounded to a single initial paint.
const CACHE_PREFIX = 'dimo:oemBrand:';

function cacheKey(clientId: string): string {
  return CACHE_PREFIX + clientId.toLowerCase();
}

/** Synchronous read of the last-known brand for `clientId`, or null. */
export function readCachedBrand(clientId: string): OemBrand | null {
  if (!clientId) return null;
  try {
    const raw = localStorage.getItem(cacheKey(clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OemBrand;
    return parsed && typeof parsed.name === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedBrand(clientId: string, brand: OemBrand): void {
  try {
    localStorage.setItem(cacheKey(clientId), JSON.stringify(brand));
  } catch {
    // private mode / quota — caching is best-effort, never block on it.
  }
}

function clearCachedBrand(clientId: string): void {
  try {
    localStorage.removeItem(cacheKey(clientId));
  } catch {
    // ignore
  }
}

function safeHttpsUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}

export async function fetchOemBrand(clientId: string, brandName?: string | null): Promise<OemBrand | null> {
  if (!clientId) return null;
  const params = new URLSearchParams({ clientId });
  if (brandName) params.set('brandName', brandName);
  const url = `${consoleApiBase()}/api/brand?${params.toString()}`;
  // Bounded so a slow console-api can't stall the popup init: the auth flow
  // joins the brand fetch with the identity fetch in a Promise.all, and any
  // hang here delays every login by the network's default timeout.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) {
      // A confirmed 404 means the brand was removed — drop the stale cache so
      // the logo reverts to DIMO. Other failures (5xx) are transient: keep the
      // last-known-good cache so a flaky console-api doesn't unbrand the popup.
      if (r.status === 404) clearCachedBrand(clientId);
      return null;
    }
    const body = (await r.json()) as BrandResponse;
    if (!body.name) {
      clearCachedBrand(clientId);
      return null;
    }
    const brand: OemBrand = {
      name: body.name,
      logoUrl: safeHttpsUrl(body.logoUrl),
      iconUrl: safeHttpsUrl(body.iconUrl),
      primaryColor:
        body.primaryColor && HEX_COLOR_RE.test(body.primaryColor)
          ? body.primaryColor
          : null,
    };
    writeCachedBrand(clientId, brand);
    return brand;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
