import { useCallback, useEffect, useRef } from 'react';

export type PasskeyLookup = typeof import('../services/passkeyLookup');

/** The passkey lookup's module, loaded on demand: the first screen doesn't carry it. */
export const loadPasskeyLookup = (): Promise<PasskeyLookup> =>
  import('../services/passkeyLookup');

// The accounts API's challenges last two minutes. Their age is counted from
// when this page asked for one, which is never later than when it was made,
// so no clock but the browser's is involved.
const CHALLENGE_LIFETIME_MS = 120_000;
// Signed only with this much left; the next is asked for well before that.
const USABLE_FOR_MS = CHALLENGE_LIFETIME_MS - 15_000;
const REFRESH_AFTER_MS = CHALLENGE_LIFETIME_MS - 30_000;

/**
 * Keeps a "Sign in with a passkey" challenge ready while `active`, with the
 * lookup module that signs it, so the click can open the passkey prompt at
 * once: Safari opens it only while the click is being handled, not after a
 * network wait. Asked for when it becomes active and again before it runs
 * out; nothing is left running when inactive or unmounted. A failed fetch
 * leaves none ready.
 */
export const usePasskeyChallenge = (active: boolean) => {
  const ready = useRef<{
    lookup: PasskeyLookup;
    challenge: string;
    usableUntil: number;
  } | null>(null);
  const refresh = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Bumped by each fetch and on stop: only the latest fetch's answer is kept.
  const latest = useRef(0);
  // Asking is for while active and mounted only; a prefetch() at any other
  // time (a sign-in attempt ending late, say) does nothing.
  const asking = useRef(false);

  const stop = useCallback(() => {
    latest.current += 1;
    clearTimeout(refresh.current);
  }, []);

  const prefetch = useCallback(() => {
    if (!asking.current) return;
    stop();
    const fetch = latest.current;
    const askedAt = Date.now();
    loadPasskeyLookup()
      .then(async (lookup) => ({ lookup, ...(await lookup.fetchPasskeyChallenge()) }))
      .then(
        ({ lookup, challenge }) => {
          if (fetch !== latest.current) return;
          ready.current = { lookup, challenge, usableUntil: askedAt + USABLE_FOR_MS };
          refresh.current = setTimeout(prefetch, askedAt + REFRESH_AFTER_MS - Date.now());
        },
        () => {
          // None ready: the click asks for one.
        },
      );
  }, [stop]);

  useEffect(() => {
    if (!active) return undefined;
    asking.current = true;
    prefetch();
    return () => {
      asking.current = false;
      stop();
    };
  }, [active, prefetch, stop]);

  // Whatever the state, nothing outlives the page.
  useEffect(
    () => () => {
      asking.current = false;
      stop();
    },
    [stop],
  );

  /** The ready challenge and its module, once: null when there is none or it is too old to sign. */
  const take = useCallback((): { lookup: PasskeyLookup; challenge: string } | null => {
    const current = ready.current;
    ready.current = null;
    return current && Date.now() < current.usableUntil
      ? { lookup: current.lookup, challenge: current.challenge }
      : null;
  }, []);

  return { take, prefetch };
};
