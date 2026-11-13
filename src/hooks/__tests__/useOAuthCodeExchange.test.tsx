import React from 'react';
import { act, render } from '@testing-library/react';

import { useOAuthCodeExchange } from '../useOAuthCodeExchange';
import { submitCodeExchange } from '../../services/authService';
import { saveFlowSnapshot } from '../../utils/flowSnapshot';

vi.mock('../../services/authService', () => ({ submitCodeExchange: vi.fn() }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

const mockExchange = vi.mocked(submitCodeExchange);
const onSuccess = vi.fn();
const onFailure = vi.fn();

/** What the sign-in screen sees on each render. */
let seen: boolean[];
const Probe = () => {
  const { isExchanging } = useOAuthCodeExchange({
    clientId: 'login-with-dimo',
    redirectUri: 'https://login.example/',
    onSuccess,
    onFailure,
  });
  seen.push(isExchanging);
  return null;
};

/** A Google return to this page; trusted when this tab saved its flow. */
const returnFromGoogle = ({ trusted }: { trusted: boolean }) => {
  const flowRef = trusted
    ? saveFlowSnapshot({ clientId: '0xc' })
    : '0123456789abcdef0123456789abcdef';
  const state = JSON.stringify({ provider: 'google', flowRef });
  window.history.pushState({}, '', `/?code=abc&state=${encodeURIComponent(state)}`);
};

/** Past the hook's 500 ms wait before it reads the code. */
const afterTheWait = () =>
  act(async () => {
    vi.advanceTimersByTime(500);
  });

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  seen = [];
});
afterEach(() => vi.useRealTimers());

it('reports the exchange from the very first render of a return to finish', async () => {
  let answer!: (token: string) => void;
  mockExchange.mockReturnValue(
    new Promise((resolve) => {
      answer = resolve;
    }),
  );
  returnFromGoogle({ trusted: true });
  render(<Probe />);
  // Before the wait: the screen shows its loader, not a form to click.
  expect(seen[0]).toBe(true);

  await afterTheWait();
  expect(mockExchange).toHaveBeenCalledWith(expect.objectContaining({ code: 'abc' }));
  expect(seen.at(-1)).toBe(true);

  await act(async () => answer('token'));
  expect(onSuccess).toHaveBeenCalledWith('token');
  expect(seen.at(-1)).toBe(false);
});

it('stops when the exchange turns out to be skipped', async () => {
  returnFromGoogle({ trusted: true });
  render(<Probe />);
  expect(seen[0]).toBe(true);

  // The code was used meanwhile (say, by the same screen mounted again).
  sessionStorage.setItem('used_oauth_codes', JSON.stringify(['abc']));
  await afterTheWait();
  expect(mockExchange).not.toHaveBeenCalled();
  expect(seen.at(-1)).toBe(false);
});

it('never reports an exchange for a code already used', async () => {
  returnFromGoogle({ trusted: true });
  sessionStorage.setItem('used_oauth_codes', JSON.stringify(['abc']));
  render(<Probe />);
  await afterTheWait();
  expect(seen.every((exchanging) => !exchanging)).toBe(true);
  expect(mockExchange).not.toHaveBeenCalled();
});

it('never reports an exchange for a return this tab didn’t start', async () => {
  returnFromGoogle({ trusted: false });
  render(<Probe />);
  await afterTheWait();
  expect(seen.every((exchanging) => !exchanging)).toBe(true);
  expect(onFailure).toHaveBeenCalled();
  expect(mockExchange).not.toHaveBeenCalled();
});

it('never reports an exchange on a page without a code', async () => {
  window.history.pushState({}, '', '/?clientId=0xc');
  render(<Probe />);
  await afterTheWait();
  expect(seen.every((exchanging) => !exchanging)).toBe(true);
});
