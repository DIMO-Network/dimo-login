/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import React from 'react';
import { act, render } from '@testing-library/react';

vi.mock('../../services/passkeyLookup', () => ({ fetchPasskeyChallenge: vi.fn() }));

import { fetchPasskeyChallenge } from '../../services/passkeyLookup';
import { usePasskeyChallenge } from '../usePasskeyChallenge';

let hook!: ReturnType<typeof usePasskeyChallenge>;
const Probe = ({ active }: { active: boolean }) => {
  hook = usePasskeyChallenge(active);
  return null;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(fetchPasskeyChallenge).mockImplementation(async () => ({
    challenge: 'AQID',
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
  }));
});
afterEach(() => vi.useRealTimers());

/** Lets the module load and the fetch answer. */
const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

it('asks for nothing while inactive, even when told to', async () => {
  render(<Probe active={false} />);
  act(() => hook.prefetch());
  await settle();
  await act(() => vi.advanceTimersByTimeAsync(300_000));
  expect(fetchPasskeyChallenge).not.toHaveBeenCalled();
});

it('stops asking once inactive, and a late prefetch doesn’t start again', async () => {
  const { rerender } = render(<Probe active />);
  await settle();
  expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(1);
  rerender(<Probe active={false} />);
  act(() => hook.prefetch());
  await act(() => vi.advanceTimersByTimeAsync(300_000));
  expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(1);
});

it('leaves nothing running once unmounted', async () => {
  const { unmount } = render(<Probe active />);
  await settle();
  const { prefetch } = hook;
  unmount();
  act(() => prefetch());
  await act(() => vi.advanceTimersByTimeAsync(300_000));
  expect(fetchPasskeyChallenge).toHaveBeenCalledTimes(1);
});

it('keeps one ready while active', async () => {
  render(<Probe active />);
  await settle();
  expect(hook.take()?.challenge).toBe('AQID');
  expect(hook.take()).toBeNull();
});
