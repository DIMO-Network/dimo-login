/**
 * Timeout helpers. The app talks to WebAuthn, Turnkey, a ZeroDev bundler/paymaster,
 * Polygon RPC, an auth API, Apollo/identity-api, and IPFS gateways — almost none of
 * which had a client-side timeout, so a slow/unresponsive backend left the UI
 * spinning forever. These bound the wait.
 */

export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Reject if `promise` doesn't settle within `ms`. The underlying work may still
 * continue (an arbitrary promise can't be cancelled) — this only stops the UI from
 * waiting forever. For network calls you CAN actually abort, prefer fetchWithTimeout.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'operation',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new TimeoutError(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** fetch that actually aborts the request on timeout (or when `signal` fires). */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  // Forward an upstream abort signal if the caller passed one.
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
