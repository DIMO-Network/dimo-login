import { fetchWithTimeout } from '../utils/withTimeout';

const IDENTITY_API_URL =
  process.env.REACT_APP_DIMO_IDENTITY_URL || 'https://identity-api.dev.dimo.zone/query';

const IDENTITY_TIMEOUT_MS = 30_000;

export interface IdentityResult<T> {
  data: T | null;
  errors: { message: string }[];
}

/**
 * POSTs one GraphQL query to identity-api. Without a timeout a hung query would
 * stall validateCredentials / useFetchVehicles and leave their loaders spinning.
 * Throws on a non-2xx answer, a non-JSON body or a network error; GraphQL errors
 * come back in `errors` for the caller to judge.
 */
export async function queryIdentity<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<IdentityResult<T>> {
  const response = await fetchWithTimeout(
    IDENTITY_API_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    IDENTITY_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(`Identity API answered ${response.status}`);
  }
  const body = await response.json();
  return { data: body.data ?? null, errors: body.errors ?? [] };
}
