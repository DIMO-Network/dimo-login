const RELOADED_AT = 'dimo:chunk-reload-at';
const RELOAD_WINDOW_MS = 10_000;

/**
 * A lazy screen's code didn't load: most often a deploy replaced its chunk
 * while this page was open, or the network dropped. The loaders in
 * src/screens.tsx turn a failed import into this error, so ScreenErrorBoundary
 * can tell it from a screen that broke while rendering.
 */
export class ChunkLoadError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = 'ChunkLoadError';
  }
}

/**
 * Whether a missing chunk should reload the page to pick up the current build.
 * It does the first time, and records when. It doesn't when the chunk is
 * really unreachable and another reload won't help: the page reloaded for it
 * in the last 10 s, or this page is that reload (the record falls in the 10 s
 * before `timeOrigin`, when this page started loading), however long it has
 * been open. Without storage there's no record, so it never reloads (no loop).
 */
export const shouldReloadForMissingChunk = (deps: {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  now: number;
  timeOrigin: number;
}): boolean => {
  const { storage, now, timeOrigin } = deps;
  const withinWindowBefore = (time: number, last: number) =>
    last <= time && time - last <= RELOAD_WINDOW_MS;
  try {
    const stored = storage.getItem(RELOADED_AT);
    if (stored !== null) {
      const last = Number(stored);
      if (withinWindowBefore(now, last) || withinWindowBefore(timeOrigin, last)) {
        return false;
      }
    }
    storage.setItem(RELOADED_AT, String(now));
    return true;
  } catch {
    return false;
  }
};

/** Reloads the page. Its own export, so tests can replace it. */
export const reloadPage = (): void => window.location.reload();
