export const pollForCondition = async (
  fetchFunction: () => Promise<boolean>,
  maxAttempts = 10,
  intervalMs = 5000,
  signal?: AbortSignal,
): Promise<boolean> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Stop polling if the caller has unmounted/cancelled — otherwise this keeps
    // hitting the API (and could setState) against a dead component for up to
    // maxAttempts * intervalMs (50s by default).
    if (signal?.aborted) return false;

    if (await fetchFunction()) return true;

    console.log(`Attempt ${attempts + 1}: Condition not met, retrying...`);
    attempts++;
    // Abortable sleep: resolve early if the signal fires during the interval.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, intervalMs);
      const onAbort = () => {
        clearTimeout(timer);
        resolve();
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  console.log('Max attempts reached, condition not met.');
  return false;
};
