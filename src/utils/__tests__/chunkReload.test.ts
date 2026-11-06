import { ChunkLoadError, shouldReloadForMissingChunk } from '../chunkReload';

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

// When this page started loading.
const timeOrigin = 1_800_000_000_000;

it('reloads on the first missing chunk', () => {
  const storage = memoryStorage();

  expect(shouldReloadForMissingChunk({ storage, now: 1000, timeOrigin: 0 })).toBe(true);
  expect(storage.getItem(RELOADED_AT)).toBe('1000');
});

it('does not reload again within 10 s', () => {
  const storage = memoryStorage({ [RELOADED_AT]: '1000' });

  expect(shouldReloadForMissingChunk({ storage, now: 5000, timeOrigin: 0 })).toBe(false);
  expect(storage.getItem(RELOADED_AT)).toBe('1000');
});

it('reloads again after 10 s', () => {
  const storage = memoryStorage({ [RELOADED_AT]: '1000' });

  expect(shouldReloadForMissingChunk({ storage, now: 12000, timeOrigin: 0 })).toBe(true);
  expect(storage.getItem(RELOADED_AT)).toBe('12000');
});

it('does not reload a page that its own reload loaded, however long it has been open', () => {
  // The chunk is gone for good: reloading again would loop.
  const storage = memoryStorage({ [RELOADED_AT]: String(timeOrigin - 500) });

  expect(
    shouldReloadForMissingChunk({ storage, now: timeOrigin + 60_000, timeOrigin }),
  ).toBe(false);
});

it('reloads despite a record left by an older page', () => {
  const storage = memoryStorage({ [RELOADED_AT]: String(timeOrigin - 5 * 60_000) });

  expect(
    shouldReloadForMissingChunk({ storage, now: timeOrigin + 1000, timeOrigin }),
  ).toBe(true);
  expect(storage.getItem(RELOADED_AT)).toBe(String(timeOrigin + 1000));
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

  expect(shouldReloadForMissingChunk({ storage, now: 1000, timeOrigin: 0 })).toBe(false);
});

it('keeps the failed import as the cause', () => {
  const failure = new TypeError('Failed to fetch dynamically imported module');
  const error = new ChunkLoadError(failure);

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe('ChunkLoadError');
  expect(error.message).toBe(failure.message);
  expect(error.cause).toBe(failure);
});
