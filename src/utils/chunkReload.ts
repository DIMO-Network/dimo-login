const RELOADED_AT = 'dimo:chunk-reload-at';
const RELOAD_WINDOW_MS = 10_000;

/**
 * Handles Vite's `vite:preloadError`: a lazy chunk didn't load, most often
 * because a deploy replaced it while this page was open. The first time, the
 * page reloads to pick up the new build. If it already reloaded in the last
 * 10 s, the chunk is really unreachable, so the event is left alone and the
 * import fails into ScreenErrorBoundary instead of reloading again.
 *
 * preventDefault() is called only on the reload path: Vite then resolves the
 * failed import to undefined rather than rejecting it.
 */
export const reloadOnceForMissingChunk = (
  event: Event,
  deps: {
    storage: Pick<Storage, 'getItem' | 'setItem'>;
    reload: () => void;
    now: number;
  },
): void => {
  const { storage, reload, now } = deps;
  try {
    const last = storage.getItem(RELOADED_AT);
    if (last !== null && now - Number(last) <= RELOAD_WINDOW_MS) return;
    storage.setItem(RELOADED_AT, String(now));
  } catch {
    // Without a record of the last reload, reloading could loop forever.
    return;
  }
  event.preventDefault();
  reload();
};
