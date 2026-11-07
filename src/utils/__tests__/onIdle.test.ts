import { onIdle } from '../onIdle';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('with requestIdleCallback', () => {
  it('runs the callback when idle, or after 2 s at the latest', () => {
    const requestIdleCallback = vi.fn(() => 7);
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const callback = vi.fn();

    onIdle(callback);

    expect(requestIdleCallback).toHaveBeenCalledWith(callback, { timeout: 2000 });
  });

  it('cancels it', () => {
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn(() => 7),
    );
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);

    onIdle(vi.fn())();

    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });
});

describe('without requestIdleCallback (Safari)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('cancelIdleCallback', undefined);
  });

  it('runs the callback after 200 ms', () => {
    const callback = vi.fn();

    onIdle(callback);
    vi.advanceTimersByTime(199);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels it', () => {
    const callback = vi.fn();

    onIdle(callback)();
    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });
});
