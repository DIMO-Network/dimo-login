import { withTimeout, TimeoutError } from '../withTimeout';
import { pollForCondition } from '../pollingUtils';

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'fast')).resolves.toBe('ok');
  });

  it('rejects with a TimeoutError when the promise is too slow', async () => {
    const slow = new Promise((resolve) => setTimeout(() => resolve('late'), 100));
    await expect(withTimeout(slow, 10, 'slow')).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe('pollForCondition abort', () => {
  it('stops polling once the signal is aborted', async () => {
    const controller = new AbortController();
    let calls = 0;
    const fn = async () => {
      calls += 1;
      controller.abort(); // abort during the first attempt
      return false;
    };
    const result = await pollForCondition(fn, 5, 5, controller.signal);
    expect(result).toBe(false);
    expect(calls).toBe(1); // no further attempts after abort
  });
});
