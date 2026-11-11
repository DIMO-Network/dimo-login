import { logout } from '../authUtils';
import { UiStates } from '../../enums';

vi.mock('../messageHandler', () => ({
  backToThirdParty: vi.fn(),
  sendMessageToReferrer: vi.fn(),
}));

const CLIENT = '0xc' as const;

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

  it('still signs out when nobody is signed in', () => {
    const setUiState = vi.fn();
    expect(() => logout(CLIENT, 'https://app.example/cb', '', setUiState)).not.toThrow();
    expect(setUiState).not.toHaveBeenCalledWith(UiStates.SUCCESS);
  });
});
