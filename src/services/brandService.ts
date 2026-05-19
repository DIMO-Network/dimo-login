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
}

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
}

export async function fetchOemBrand(clientId: string): Promise<OemBrand | null> {
  if (!clientId) return null;
  const url = `${consoleApiBase()}/api/brand?clientId=${encodeURIComponent(clientId)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const body = (await r.json()) as BrandResponse;
    if (!body.name) return null;
    return {
      name: body.name,
      logoUrl: body.logoUrl ?? null,
      iconUrl: body.iconUrl ?? null,
    };
  } catch {
    return null;
  }
}
