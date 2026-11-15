import type { Mock } from 'vitest';

import { i18n } from '../../i18n/instance';
import { getDeviceKey, sendSignInNotice } from '../signInNotice';

let fetchMock: Mock;

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
  (global as unknown as { fetch: Mock }).fetch = fetchMock;
});

describe('getDeviceKey', () => {
  it('makes a random base64url key once, then keeps it', () => {
    const key = getDeviceKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(localStorage.getItem('dimo_device_key')).toBe(key);
    expect(getDeviceKey()).toBe(key);
  });

  it('replaces a stored key that isn’t one', () => {
    localStorage.setItem('dimo_device_key', 'short');
    expect(getDeviceKey()).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('is null when storage is blocked', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      expect(getDeviceKey()).toBeNull();
    } finally {
      getItem.mockRestore();
    }
  });
});

describe('sendSignInNotice', () => {
  it('posts the browser’s key and the language with the token just made', () => {
    sendSignInNotice('jwt-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/account\/sign-in-notice$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt-1' });
    expect(JSON.parse(init.body)).toEqual({
      deviceKey: localStorage.getItem('dimo_device_key'),
      language: i18n.resolvedLanguage ?? 'en',
    });
  });

  it('sends nothing when the browser can’t keep a key (every sign-in would look new)', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      sendSignInNotice('jwt-1');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
    }
  });

  it('never throws, whatever the network does', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    expect(() => sendSignInNotice('jwt-1')).not.toThrow();
    await Promise.resolve();
  });
});
