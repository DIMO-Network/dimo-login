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
 * It does the first time, and records when. If the page already reloaded in
 * the last 10 s, the chunk is really unreachable and another reload won't
 * help. Without storage there's no record, so it never reloads (no loop).
 */
export const shouldReloadForMissingChunk = (deps: {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  now: number;
}): boolean => {
  const { storage, now } = deps;
  try {
    const last = storage.getItem(RELOADED_AT);
    if (last !== null && now - Number(last) <= RELOAD_WINDOW_MS) return false;
    storage.setItem(RELOADED_AT, String(now));
    return true;
  } catch {
    return false;
  }
};

/** Reloads the page. Its own export, so tests can replace it. */
export const reloadPage = (): void => window.location.reload();
