import type { Mock } from 'vitest';
import { captureMessage, withScope } from '@sentry/react';
import type { Event } from '@sentry/react';

import { reportRefusal } from '../reportRefusal';

vi.mock('@sentry/react', () => ({ captureMessage: vi.fn(), withScope: vi.fn() }));

const mockScope = {
  setLevel: vi.fn(),
  setFingerprint: vi.fn(),
  setTag: vi.fn(),
  addEventProcessor: vi.fn(),
};

beforeEach(() => {
  (withScope as Mock).mockImplementation((callback) => callback(mockScope));
});

const processEvent = (event: Event): Event => {
  const [processor] = mockScope.addEventProcessor.mock.calls[0];
  return processor(event);
};

it('reports a warning, one issue per reason, with the tags it has', () => {
  reportRefusal('untrusted_caller', {
    clientId: '0x1111111111111111111111111111111111111111',
    appOrigin: 'https://app.example',
    callers: 'https://attacker.example',
    mode: undefined,
    referrer: null,
  });

  expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
  expect(mockScope.setFingerprint).toHaveBeenCalledWith([
    'login.refused',
    'untrusted_caller',
  ]);
  expect(mockScope.setTag.mock.calls).toEqual([
    ['reason', 'untrusted_caller'],
    ['clientId', '0x1111111111111111111111111111111111111111'],
    ['appOrigin', 'https://app.example'],
    ['callers', 'https://attacker.example'],
  ]);
  expect(captureMessage).toHaveBeenCalledTimes(1);
  expect(captureMessage).toHaveBeenCalledWith('login.refused');
});

it('keeps the OAuth code out of the event', () => {
  reportRefusal('untrusted_oauth_return', { provider: 'google' });

  const event = processEvent({
    request: {
      url: 'https://login.dimo.org/?code=secret-code&state=%7B%7D#frag',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://accounts.google.com/signin?continue=secret-code',
      },
    },
    breadcrumbs: [
      { category: 'console', message: 'https://login.dimo.org/?code=secret-code' },
    ],
  });

  expect(event.request).toEqual({
    url: 'https://login.dimo.org/',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://accounts.google.com' },
  });
  expect(event.breadcrumbs).toBeUndefined();
  expect(JSON.stringify(event)).not.toContain('secret-code');
});
