import { useCallback, useEffect, useRef } from 'react';

import { fetchPasskeyChallenge } from '../services/passkeyLookup';

// The accounts API's challenges last two minutes. Their age is counted from
// when this page asked for one, which is never later than when it was made,
// so no clock but the browser's is involved.
const CHALLENGE_LIFETIME_MS = 120_000;
// Signed only with this much left; the next is asked for well before that.
const USABLE_FOR_MS = CHALLENGE_LIFETIME_MS - 15_000;
const REFRESH_AFTER_MS = CHALLENGE_LIFETIME_MS - 30_000;

/**
 * Keeps a "Sign in with a passkey" challenge ready while `active`, so the
 * click can open the passkey prompt at once: Safari opens it only while the
 * click is being handled, not after a network wait. Asked for when it becomes
 * active and again before it runs out; nothing is left running when inactive
 * or unmounted. A failed fetch leaves none ready.
 */
export const usePasskeyChallenge = (active: boolean) => {
  const ready = useRef<{ challenge: string; usableUntil: number } | null>(null);
  const refresh = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Bumped by each fetch and on stop: only the latest fetch's answer is kept.
  const latest = useRef(0);

  const stop = useCallback(() => {
    latest.current += 1;
    clearTimeout(refresh.current);
  }, []);

  const prefetch = useCallback(() => {
    stop();
    const fetch = latest.current;
    const askedAt = Date.now();
    fetchPasskeyChallenge().then(
      ({ challenge }) => {
        if (fetch !== latest.current) return;
        ready.current = { challenge, usableUntil: askedAt + USABLE_FOR_MS };
        refresh.current = setTimeout(prefetch, askedAt + REFRESH_AFTER_MS - Date.now());
      },
      () => {
        // None ready: the click asks for one.
      },
    );
  }, [stop]);

  useEffect(() => {
    if (!active) return undefined;
    prefetch();
    return stop;
  }, [active, prefetch, stop]);

  /** The ready challenge, once: null when there is none or it is too old to sign. */
  const take = useCallback((): string | null => {
    const current = ready.current;
    ready.current = null;
    return current && Date.now() < current.usableUntil ? current.challenge : null;
  }, []);

  return { take, prefetch };
};
