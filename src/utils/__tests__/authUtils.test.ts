import { buildAuthPayload, isTokenExpiredError, logout } from '../authUtils';
import { UiStates } from '../../enums';
import type { UserObject } from '../../models/user';
import { clearSessionData, storeJWTInCookies } from '../../services/storageService';
import * as messageHandler from '../messageHandler';

vi.mock('../messageHandler', () => ({
  backToThirdParty: vi.fn(),
  sendMessageToReferrer: vi.fn(),
}));

const CLIENT = '0xc' as const;

const b64 = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
const tokenExpiringIn = (seconds: number, who: string) =>
  `${b64({ alg: 'none' })}.${b64({ sub: who, exp: Math.floor(Date.now() / 1000) + seconds })}.sig`;
const account = (name: string): UserObject => ({
  email: `${name}@x.co`,
  subOrganizationId: `sub-${name}`,
  hasPasskey: true,
  walletAddress: `0x${name}-eoa`,
  smartContractAddress: `0x${name}-sca`,
  emailVerified: true,
});

describe('buildAuthPayload', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => clearSessionData(CLIENT));

  it('sends this tab’s login, even after another tab signed the app in as someone else', () => {
    const alice = tokenExpiringIn(3600, 'alice');
    storeJWTInCookies(CLIENT, tokenExpiringIn(7200, 'bob'));
    localStorage.setItem(`user_data_${CLIENT}`, JSON.stringify(account('bob')));

    expect(buildAuthPayload(CLIENT, alice, account('alice'))).toEqual({
      token: alice,
      walletAddress: '0xalice-sca',
      email: undefined,
    });
  });

  it('falls back to the stored login when this tab has none', () => {
    const bob = tokenExpiringIn(7200, 'bob');
    storeJWTInCookies(CLIENT, bob);
    localStorage.setItem(`user_data_${CLIENT}`, JSON.stringify(account('bob')));

    expect(
      buildAuthPayload(CLIENT, '', { ...account('x'), subOrganizationId: '' }),
    ).toMatchObject({ token: bob, walletAddress: '0xbob-sca' });
  });

  it.each([
    ['has run out', -1],
    ['has less than a minute left', 30],
  ])('refuses a token that %s', (_, seconds) => {
    // An hour idle on the done screen: the cookie is gone, this tab's token too old.
    let thrown: unknown;
    try {
      buildAuthPayload(CLIENT, tokenExpiringIn(seconds, 'alice'), account('alice'));
    } catch (error) {
      thrown = error;
    }
    expect(isTokenExpiredError(thrown)).toBe(true);
  });

  it('sends a token with a minute or more left', () => {
    const token = tokenExpiringIn(90, 'alice');
    expect(buildAuthPayload(CLIENT, token, account('alice')).token).toBe(token);
  });
});

describe('logout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drops the acting account’s wallet session and the legacy key, keeping the account listed', () => {
    localStorage.setItem(
      `user_data_${CLIENT}`,
      JSON.stringify({ email: 'alice@x.co', subOrganizationId: 'sub-a' }),
    );
    localStorage.setItem(
      'turnkey_session_sub-a',
      JSON.stringify({ sessionType: 'api_key' }),
    );
    localStorage.setItem(
      'turnkey_session_sub-b',
      JSON.stringify({ sessionType: 'passkey' }),
    );
    localStorage.setItem('turnkey_session', JSON.stringify({ sessionType: 'passkey' }));
    localStorage.setItem(
      'dimo_accounts',
      JSON.stringify([
        { email: 'alice@x.co', subOrganizationId: 'sub-a', lastUsedAt: 1 },
      ]),
    );

    logout(CLIENT, 'https://app.example/cb', '', vi.fn());

    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expect(localStorage.getItem('turnkey_session')).toBeNull();
    expect(localStorage.getItem(`user_data_${CLIENT}`)).toBeNull();
    // Another account's session is not this logout's business.
    expect(localStorage.getItem('turnkey_session_sub-b')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem('dimo_accounts') ?? '[]')).toHaveLength(1);
  });

  it('ends the session of the account the app last signed in as, after “Use another account” too', () => {
    // "Use another account" removed the stored user; the logged email still names the account.
    localStorage.setItem(`logged_email_${CLIENT}`, 'alice@x.co');
    localStorage.setItem(
      'dimo_accounts',
      JSON.stringify([
        { email: 'alice@x.co', subOrganizationId: 'sub-a', lastUsedAt: 1 },
      ]),
    );
    localStorage.setItem(
      'turnkey_session_sub-a',
      JSON.stringify({ sessionType: 'api_key' }),
    );

    logout(CLIENT, 'https://app.example/cb', '', vi.fn());

    expect(localStorage.getItem('turnkey_session_sub-a')).toBeNull();
    expect(JSON.parse(localStorage.getItem('dimo_accounts') ?? '[]')).toHaveLength(1);
  });

  it('still signs the app out when removing the wallet session throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    const { sendMessageToReferrer } = vi.mocked(messageHandler);
    expect(() => logout(CLIENT, 'https://app.example/cb', '', vi.fn())).not.toThrow();
    expect(sendMessageToReferrer).toHaveBeenCalledWith({ eventType: 'logout' });
    spy.mockRestore();
  });

  it('still signs out when nobody is signed in', () => {
    const setUiState = vi.fn();
    expect(() => logout(CLIENT, 'https://app.example/cb', '', setUiState)).not.toThrow();
    expect(setUiState).not.toHaveBeenCalledWith(UiStates.SUCCESS);
  });
});
