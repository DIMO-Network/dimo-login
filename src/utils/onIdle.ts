/**
 * Runs the callback when the browser is idle, or after 2 s at the latest.
 * Safari has no requestIdleCallback, so there it runs after 200 ms. Returns a
 * function that cancels it.
 */
export const onIdle = (callback: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(callback, 200);
  return () => window.clearTimeout(timer);
};
