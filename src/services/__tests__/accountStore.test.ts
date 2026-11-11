import type { UserObject } from '../../models/user';
import {
  clearWalletSession,
  forgetAccount,
  getRememberedAccounts,
  getWalletSession,
  rememberAccount,
  setWalletSession,
} from '../accountStore';

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

beforeEach(() => localStorage.clear());

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
    setWalletSession('sub-a', {
      sessionType: 'api_key',
      embeddedKey: 'k',
      credentialBundle: 'b',
      expiresAt: 9,
    });
    setWalletSession('sub-b', { sessionType: 'passkey', expiresAt: 9 });
    expect(getWalletSession('sub-a', CLIENT)).toMatchObject({ sessionType: 'api_key' });
    clearWalletSession('sub-b');
    expect(getWalletSession('sub-a', CLIENT)).not.toBeNull();
    expect(getWalletSession('sub-b', CLIENT)).toBeNull();
  });

  it('adopts the legacy wallet session for the account this app is signed in as', () => {
    localStorage.setItem(
      'turnkey_session',
      JSON.stringify({ sessionType: 'passkey', expiresAt: 9 }),
    );
    localStorage.setItem(`user_data_${CLIENT}`, JSON.stringify(A));
    expect(getWalletSession('sub-b', CLIENT)).toBeNull();
    expect(getWalletSession('sub-a', CLIENT)).toEqual({ sessionType: 'passkey', expiresAt: 9 });
    expect(localStorage.getItem('turnkey_session')).toBeNull();
    expect(localStorage.getItem('turnkey_session_sub-a')).not.toBeNull();
  });

  it('forgets an account, its wallet session and the app’s old memory of it', () => {
    rememberAccount(A, 1);
    setWalletSession('sub-a', { sessionType: 'passkey', expiresAt: 9 });
    localStorage.setItem(`logged_email_${CLIENT}`, 'alice@x.co');
    forgetAccount('ALICE@x.co', CLIENT);
    expect(getRememberedAccounts(CLIENT)).toEqual([]);
    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
  });

  it.each(['{not json', '{"a":1}', '[1,"x",null]'])(
    'treats corrupt storage %s as no accounts',
    (raw) => {
      localStorage.setItem('dimo_accounts', raw);
      expect(getRememberedAccounts(null)).toEqual([]);
    },
  );
});
