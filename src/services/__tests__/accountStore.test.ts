import type { UserObject } from '../../models/user';
import {
  clearWalletSession,
  endWalletSession,
  forgetAccount,
  getRememberedAccounts,
  getWalletSession,
  isPasskeyOfferSnoozed,
  listAppsSignedInAs,
  markHasPasskey,
  rememberAccount,
  setWalletSession,
  signOutAppHere,
  snoozePasskeyOffer,
} from '../accountStore';
import { getJWTFromCookies, storeJWTInCookies } from '../storageService';

const CLIENT = '0xb92d74B468B4047289AEa7c9B953066E39768C16' as const;
const A = {
  email: 'Alice@x.co',
  subOrganizationId: 'sub-a',
  hasPasskey: false,
  walletAddress: null,
  smartContractAddress: '0xa',
  emailVerified: true,
} as UserObject;
const B = { ...A, email: 'bob@x.co', subOrganizationId: 'sub-b', hasPasskey: true };
const C = { ...A, email: 'carol@x.co', subOrganizationId: 'sub-c' };

const PASSKEY = { sessionType: 'passkey', expiresAt: 9 } as const;
const apiKey = (expiresAt: number) =>
  ({
    sessionType: 'api_key',
    embeddedKey: 'k',
    credentialBundle: 'b',
    expiresAt,
  }) as const;

// Unpadded, as in a real JWT (the cookie reader splits on '=').
const b64 = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
const JWT = `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 7200 })}.sig`;

/** An app signed in as the user on this browser, as createSession leaves it. */
const signInApp = (clientId: `0x${string}`, user: UserObject) => {
  storeJWTInCookies(clientId, JWT);
  localStorage.setItem(`user_data_${clientId}`, JSON.stringify(user));
};

const clearCookies = () =>
  document.cookie
    .split('; ')
    .filter(Boolean)
    .forEach((cookie) => {
      document.cookie = `${cookie.split('=')[0]}=; Max-Age=0; path=/`;
    });

beforeEach(() => {
  localStorage.clear();
  clearCookies();
});

describe('accountStore', () => {
  it('remembers accounts most recent first, by lowercased email', () => {
    rememberAccount(A, 1);
    rememberAccount(B, 2);
    rememberAccount(A, 3);
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual([
      'alice@x.co',
      'bob@x.co',
    ]);
  });

  it('keeps at most five', () => {
    for (let i = 0; i < 7; i++) {
      rememberAccount({ ...A, email: `u${i}@x.co`, subOrganizationId: `s${i}` }, i);
    }
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual([
      'u6@x.co',
      'u5@x.co',
      'u4@x.co',
      'u3@x.co',
      'u2@x.co',
    ]);
  });

  it('shows an account an older build remembered for this app', () => {
    localStorage.setItem(`logged_email_${CLIENT}`, 'old@x.co');
    expect(getRememberedAccounts(CLIENT)).toEqual([{ email: 'old@x.co', lastUsedAt: 0 }]);
  });

  it('keeps each account’s wallet session apart', () => {
    setWalletSession('sub-a', apiKey(9));
    setWalletSession('sub-b', PASSKEY);
    expect(getWalletSession('sub-a')).toMatchObject({ sessionType: 'api_key' });
    clearWalletSession('sub-b');
    expect(getWalletSession('sub-a')).not.toBeNull();
    expect(getWalletSession('sub-b')).toBeNull();
  });

  it('never reads or touches the single session an older build stored', () => {
    localStorage.setItem('turnkey_session', JSON.stringify(PASSKEY));
    localStorage.setItem(`user_data_${CLIENT}`, JSON.stringify(A));
    expect(getWalletSession('sub-a')).toBeNull();
    expect(localStorage.getItem('turnkey_session')).not.toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
  });

  it('storing a wallet session removes the one an older build stored', () => {
    localStorage.setItem('turnkey_session', JSON.stringify(PASSKEY));
    setWalletSession('sub-a', PASSKEY);
    expect(localStorage.getItem('turnkey_session')).toBeNull();
    expect(getWalletSession('sub-a')).toEqual(PASSKEY);
  });

  it('ending a wallet session removes that account’s and an older build’s, nothing else', () => {
    setWalletSession('sub-a', PASSKEY);
    setWalletSession('sub-b', PASSKEY);
    localStorage.setItem('turnkey_session', JSON.stringify(PASSKEY));
    endWalletSession('sub-a');
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expect(localStorage.getItem('turnkey_session')).toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-b')).not.toBeNull();

    localStorage.setItem('turnkey_session', JSON.stringify(PASSKEY));
    endWalletSession(undefined);
    expect(localStorage.getItem('turnkey_session')).toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-b')).not.toBeNull();
  });

  it('forgets an account, its wallet session and the app’s old memory of it', () => {
    rememberAccount(A, 1);
    setWalletSession('sub-a', PASSKEY);
    localStorage.setItem(`logged_email_${CLIENT}`, 'alice@x.co');
    forgetAccount('ALICE@x.co');
    expect(getRememberedAccounts(CLIENT)).toEqual([]);
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
  });

  it('forgets an account everywhere on this device, leaving other accounts alone', () => {
    rememberAccount(A, 1);
    rememberAccount(B, 2);
    setWalletSession('sub-a', PASSKEY);
    setWalletSession('sub-b', PASSKEY);
    signInApp('0xA', A);
    signInApp('0xB', A);
    localStorage.setItem('logged_email_0xB', 'alice@x.co');
    // An email answer stored before answers were per account belongs to alice.
    localStorage.setItem('email_granted_0xB', 'true');
    signInApp('0xC', B);
    localStorage.setItem('logged_email_0xC', 'bob@x.co');

    forgetAccount('ALICE@x.co');

    expect(localStorage.getItem('user_data_0xA')).toBeNull();
    expect(localStorage.getItem('user_data_0xB')).toBeNull();
    expect(localStorage.getItem('logged_email_0xB')).toBeNull();
    expect(getJWTFromCookies('0xA')).toBeNull();
    expect(getJWTFromCookies('0xB')).toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    // The old answer moved to alice's own key before her logged email went.
    expect(localStorage.getItem('email_granted_0xB_alice@x.co')).toBe('true');

    expect(localStorage.getItem('user_data_0xC')).not.toBeNull();
    expect(localStorage.getItem('logged_email_0xC')).toBe('bob@x.co');
    expect(getJWTFromCookies('0xC')).toBe(JWT);
    expect(localStorage.getItem('turnkey_session_sub-b')).not.toBeNull();
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual(['bob@x.co']);
  });

  it('forgets the session of an account known only from an app’s stored user', () => {
    localStorage.setItem(`logged_email_${CLIENT}`, 'alice@x.co');
    localStorage.setItem(`user_data_${CLIENT}`, JSON.stringify(A));
    setWalletSession('sub-a', PASSKEY);
    localStorage.setItem('turnkey_session', JSON.stringify(PASSKEY));
    forgetAccount('alice@x.co');
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expect(localStorage.getItem('turnkey_session')).toBeNull();
    expect(localStorage.getItem(`user_data_${CLIENT}`)).toBeNull();
  });

  it('forgets the signed-in account’s session even when the list is corrupt', () => {
    localStorage.setItem('dimo_accounts', '{not json');
    localStorage.setItem(`user_data_${CLIENT}`, JSON.stringify(A));
    setWalletSession('sub-a', PASSKEY);
    forgetAccount('alice@x.co');
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
  });

  it.each(['{not json', '{"a":1}', '[1,"x",null]'])(
    'treats corrupt storage %s as no accounts',
    (raw) => {
      localStorage.setItem('dimo_accounts', raw);
      expect(getRememberedAccounts(null)).toEqual([]);
    },
  );

  it('lowercases emails read from storage', () => {
    localStorage.setItem(
      'dimo_accounts',
      JSON.stringify([{ email: 'Bob@X.co', lastUsedAt: 1 }]),
    );
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual(['bob@x.co']);
  });

  it('reads at most five accounts from an oversized list', () => {
    localStorage.setItem(
      'dimo_accounts',
      JSON.stringify(
        Array.from({ length: 8 }, (_, i) => ({ email: `u${i}@x.co`, lastUsedAt: 9 - i })),
      ),
    );
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual([
      'u0@x.co',
      'u1@x.co',
      'u2@x.co',
      'u3@x.co',
      'u4@x.co',
    ]);
  });

  it('reads an email stored twice in different cases as one account, the most recent', () => {
    localStorage.setItem(
      'dimo_accounts',
      JSON.stringify([
        { email: 'Bob@x.co', subOrganizationId: 'sub-new', lastUsedAt: 2 },
        { email: 'bob@x.co', subOrganizationId: 'sub-old', lastUsedAt: 1 },
      ]),
    );
    expect(getRememberedAccounts(null)).toEqual([
      { email: 'bob@x.co', subOrganizationId: 'sub-new', lastUsedAt: 2 },
    ]);
  });

  it.each([{ email: '' }, { email: 'not-an-email' }])(
    'skips a stored account with no usable email (%o)',
    (entry) => {
      localStorage.setItem(
        'dimo_accounts',
        JSON.stringify([
          { ...entry, lastUsedAt: 2 },
          { email: 'bob@x.co', lastUsedAt: 1 },
        ]),
      );
      expect(getRememberedAccounts(null).map((a) => a.email)).toEqual(['bob@x.co']);
    },
  );

  it('never throws when storage is blocked', () => {
    const boom = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'key').mockImplementation(boom);
    try {
      expect(getRememberedAccounts(CLIENT)).toEqual([]);
      expect(() => rememberAccount(A, 1)).not.toThrow();
      expect(() => forgetAccount('alice@x.co')).not.toThrow();
      expect(getWalletSession('sub-a')).toBeNull();
      expect(() => setWalletSession('sub-a', PASSKEY)).not.toThrow();
      expect(() => clearWalletSession('sub-a')).not.toThrow();
      expect(() => endWalletSession('sub-a')).not.toThrow();
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe('wallet sessions nothing can use any more', () => {
  it('are dropped for an account no longer listed when another is remembered', () => {
    setWalletSession('sub-gone', PASSKEY);
    rememberAccount(A, 1);
    expect(localStorage.getItem('turnkey_session_sub-gone')).toBeNull();
  });

  it('are dropped for an account trimmed off the list', () => {
    for (let i = 0; i < 6; i++) {
      setWalletSession(`s${i}`, PASSKEY);
      rememberAccount({ ...A, email: `u${i}@x.co`, subOrganizationId: `s${i}` }, i);
    }
    expect(localStorage.getItem('turnkey_session_s0')).toBeNull();
    expect(localStorage.getItem('turnkey_session_s1')).not.toBeNull();
    expect(localStorage.getItem('turnkey_session_s5')).not.toBeNull();
  });

  it('drop an expired email-code key, keeping a live one and passkey markers', () => {
    rememberAccount(A, 1);
    rememberAccount(B, 2);
    setWalletSession('sub-a', apiKey(Date.now() - 1));
    setWalletSession('sub-b', { sessionType: 'passkey', expiresAt: Date.now() - 1 });
    setWalletSession('sub-c', apiKey(Date.now() + 60_000));
    rememberAccount(C, 3);
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-b')).not.toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-c')).not.toBeNull();
  });

  it('are dropped when an account is forgotten', () => {
    rememberAccount(B, 1);
    setWalletSession('sub-b', PASSKEY);
    setWalletSession('sub-gone', PASSKEY);
    forgetAccount('alice@x.co');
    expect(localStorage.getItem('turnkey_session_sub-gone')).toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-b')).not.toBeNull();
  });

  it('are kept for an account whose email the sign-in regex would reject', () => {
    setWalletSession('sub-x', apiKey(Date.now() + 60_000));
    rememberAccount({ ...A, email: 'u@example.xn--p1ai', subOrganizationId: 'sub-x' }, 1);
    expect(localStorage.getItem('turnkey_session_sub-x')).not.toBeNull();
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual([
      'u@example.xn--p1ai',
    ]);
  });

  it.each([[''], ['no-at-sign'], ['a b@x.co'], ['a@@b.co'], ['@x.co'], ['a@']])(
    'a stored entry with email %j is not listed',
    (email) => {
      localStorage.setItem(
        'dimo_accounts',
        JSON.stringify([{ email, subOrganizationId: 's', lastUsedAt: 1 }]),
      );
      expect(getRememberedAccounts(null)).toEqual([]);
    },
  );
});

describe('apps signed in on this browser', () => {
  const OTHER = '0x2222222222222222222222222222222222222222' as const;
  const THIRD = '0x3333333333333333333333333333333333333333' as const;

  it('lists the apps signed in as the account, whatever the stored case', () => {
    signInApp(CLIENT, A);
    signInApp(OTHER, { ...A, email: 'ALICE@x.co' });
    signInApp(THIRD, B);
    expect(listAppsSignedInAs('alice@x.co').sort()).toEqual([CLIENT, OTHER].sort());
  });

  it('skips a stored user it can’t read', () => {
    localStorage.setItem(`user_data_${OTHER}`, '{not json');
    signInApp(CLIENT, A);
    expect(listAppsSignedInAs('alice@x.co')).toEqual([CLIENT]);
  });

  it('signs one app out here: its token and stored user, nothing else', () => {
    rememberAccount(A, 1);
    setWalletSession('sub-a', PASSKEY);
    signInApp(CLIENT, A);
    signInApp(OTHER, A);
    signOutAppHere(OTHER);
    expect(getJWTFromCookies(OTHER)).toBeNull();
    expect(localStorage.getItem(`user_data_${OTHER}`)).toBeNull();
    expect(getJWTFromCookies(CLIENT)).toBe(JWT);
    expect(listAppsSignedInAs('alice@x.co')).toEqual([CLIENT]);
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual(['alice@x.co']);
    expect(getWalletSession('sub-a')).toEqual(PASSKEY);
  });
});

describe('the passkey offer', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('is snoozed for 30 days, for that account only', () => {
    snoozePasskeyOffer('sub-a', 1_000);
    expect(localStorage.getItem('dimo_passkey_offer_sub-a')).not.toBeNull();
    expect(isPasskeyOfferSnoozed('sub-a', 1_000 + 29 * DAY)).toBe(true);
    expect(isPasskeyOfferSnoozed('sub-a', 1_000 + 30 * DAY)).toBe(false);
    expect(isPasskeyOfferSnoozed('sub-b', 1_000)).toBe(false);
  });

  it('is not snoozed by a value it can’t read', () => {
    localStorage.setItem('dimo_passkey_offer_sub-a', '"soon"');
    expect(isPasskeyOfferSnoozed('sub-a')).toBe(false);
  });
});

describe('markHasPasskey', () => {
  it('records the passkey in the app’s stored user and the remembered account, and nothing else', () => {
    signInApp(CLIENT, A);
    rememberAccount(A, 1);
    markHasPasskey(CLIENT, { ...A, credentialIds: ['cred-secret'] });

    expect(JSON.parse(localStorage.getItem(`user_data_${CLIENT}`)!)).toEqual({
      ...A,
      hasPasskey: true,
    });
    expect(getRememberedAccounts(null)).toEqual([
      expect.objectContaining({ email: 'alice@x.co', hasPasskey: true }),
    ]);
    expect(JSON.stringify({ ...localStorage })).not.toContain('cred-secret');
  });

  it('keeps the remembered list’s order and times', () => {
    rememberAccount(A, 1);
    rememberAccount(B, 2);
    markHasPasskey(CLIENT, A);
    expect(getRememberedAccounts(null)).toEqual([
      expect.objectContaining({ email: 'bob@x.co', lastUsedAt: 2 }),
      expect.objectContaining({ email: 'alice@x.co', lastUsedAt: 1, hasPasskey: true }),
    ]);
  });

  it('doesn’t remember an account that isn’t remembered', () => {
    rememberAccount(B, 2);
    markHasPasskey(CLIENT, A);
    expect(getRememberedAccounts(null).map((a) => a.email)).toEqual(['bob@x.co']);
  });

  it('leaves another account’s stored user alone', () => {
    signInApp(CLIENT, B);
    markHasPasskey(CLIENT, A);
    expect(JSON.parse(localStorage.getItem(`user_data_${CLIENT}`)!)).toEqual(B);
  });

  it('never throws when storage is blocked', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'QuotaExceededError');
    });
    try {
      signInApp(CLIENT, A);
    } catch {
      // The setup write is blocked too.
    }
    expect(() => markHasPasskey(CLIENT, A)).not.toThrow();
    setItem.mockRestore();
  });
});
