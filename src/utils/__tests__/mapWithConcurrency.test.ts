import { mapWithConcurrency } from '../mapWithConcurrency';

it('keeps order and caps how many calls run at once', async () => {
  let running = 0;
  let peak = 0;
  const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 1));
    running--;
    return n * 10;
  });
  expect(results).toEqual([10, 20, 30, 40, 50, 60]);
  expect(peak).toBe(2);
});

it('starts no further calls after one fails', async () => {
  const started: number[] = [];
  await expect(
    mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      started.push(n);
      await new Promise((r) => setTimeout(r, 1));
      if (n === 1) throw new Error('boom');
      return n;
    }),
  ).rejects.toThrow('boom');
  await new Promise((r) => setTimeout(r, 10));
  expect(started).toEqual([1, 2]);
});
