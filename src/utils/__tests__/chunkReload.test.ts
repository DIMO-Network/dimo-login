import { reloadOnceForMissingChunk } from '../chunkReload';

const RELOADED_AT = 'dimo:chunk-reload-at';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
};

// What Vite dispatches on window when a lazy chunk fails to load.
const missingChunk = () => new Event('vite:preloadError', { cancelable: true });

it('reloads on the first missing chunk', () => {
  const storage = memoryStorage();
  const reload = vi.fn();
  const event = missingChunk();

  reloadOnceForMissingChunk(event, { storage, reload, now: 1000 });

  expect(reload).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
  expect(storage.getItem(RELOADED_AT)).toBe('1000');
});

it('does not reload again within 10 s', () => {
  const storage = memoryStorage({ [RELOADED_AT]: '1000' });
  const reload = vi.fn();
  const event = missingChunk();

  reloadOnceForMissingChunk(event, { storage, reload, now: 5000 });

  expect(reload).not.toHaveBeenCalled();
  // The error goes on to the screen's error boundary.
  expect(event.defaultPrevented).toBe(false);
  expect(storage.getItem(RELOADED_AT)).toBe('1000');
});

it('reloads again after 10 s', () => {
  const storage = memoryStorage({ [RELOADED_AT]: '1000' });
  const reload = vi.fn();
  const event = missingChunk();

  reloadOnceForMissingChunk(event, { storage, reload, now: 12000 });

  expect(reload).toHaveBeenCalledTimes(1);
  expect(event.defaultPrevented).toBe(true);
  expect(storage.getItem(RELOADED_AT)).toBe('12000');
});

it('does not reload when storage is blocked', () => {
  // Without a record of the last reload, a chunk that's gone for good would
  // reload the page forever.
  const storage = {
    getItem: () => {
      throw new DOMException('blocked', 'SecurityError');
    },
    setItem: vi.fn(),
  };
  const reload = vi.fn();
  const event = missingChunk();

  reloadOnceForMissingChunk(event, { storage, reload, now: 1000 });

  expect(reload).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(false);
});
