import type { Mock } from 'vitest';
import { UiStates } from '../../enums';
import { initializeSession } from '../sessionService';

const CLIENT_ID = '0xb92d74B468B4047289AEa7c9B953066E39768C16';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
const JWT = `${b64({ alg: 'HS256' })}.${b64({ exp: 4102444800 })}.sig`;
const USER = { email: 'jun@example.com', smartContractAddress: '0xabc' };

const jwtExpiringIn = (seconds: number) =>
  `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + seconds })}.sig`;

const signIn = (token: string = JWT) => {
  document.cookie = `auth_token_${CLIENT_ID}=${token}; path=/`;
  localStorage.setItem(`user_data_${CLIENT_ID}`, JSON.stringify(USER));
};

const run = (
  entryState: UiStates,
  onReturningLogin?: Mock,
  extra: Partial<Parameters<typeof initializeSession>[0]> = {},
) => {
  const setUiState = vi.fn();
  initializeSession({
    clientId: CLIENT_ID,
    setJwt: vi.fn(),
    setUser: vi.fn(),
    uiState: UiStates.EMAIL_INPUT,
    setUiState,
    entryState,
    onReturningLogin,
    ...extra,
  });
  return setUiState;
};

beforeEach(() => {
  localStorage.clear();
  document.cookie = `auth_token_${CLIENT_ID}=; Max-Age=0; path=/`;
});

describe('initializeSession', () => {
  it('sends a returning plain login to the done screen', () => {
    signIn();
    expect(run(UiStates.EMAIL_INPUT)).toHaveBeenCalledWith(UiStates.SUCCESS);
  });

  it('hands a returning plain login to the caller when it asks (embedded)', () => {
    signIn();
    const onReturningLogin = vi.fn();
    const setUiState = run(UiStates.EMAIL_INPUT, onReturningLogin);
    expect(onReturningLogin).toHaveBeenCalledWith(JWT, USER);
    expect(setUiState).not.toHaveBeenCalled();
  });

  it('goes straight to the requested flow on a valid session', () => {
    signIn();
    expect(run(UiStates.VEHICLE_MANAGER)).toHaveBeenCalledWith(UiStates.VEHICLE_MANAGER);
  });

  it('still logs out without a session, so the app hears it', () => {
    expect(run(UiStates.LOGOUT)).toHaveBeenCalledWith(UiStates.LOGOUT);
  });

  it('asks a signed-out user to sign in', () => {
    expect(run(UiStates.VEHICLE_MANAGER)).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
  });

  it('does not hand back a token with less than an hour left', () => {
    signIn(jwtExpiringIn(600));
    expect(run(UiStates.VEHICLE_MANAGER)).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
  });

  it('uses a token with more than an hour left', () => {
    signIn(jwtExpiringIn(7200));
    expect(run(UiStates.VEHICLE_MANAGER)).toHaveBeenCalledWith(UiStates.VEHICLE_MANAGER);
  });

  it('treats a token with no expiry as expired', () => {
    signIn(`${b64({ alg: 'HS256' })}.${b64({ sub: 'x' })}.sig`);
    expect(run(UiStates.EMAIL_INPUT)).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
  });

  it.each(['select_account', 'login'] as const)(
    'prompt=%s opens sign-in despite a valid session',
    (prompt) => {
      signIn();
      const setJwt = vi.fn();
      const setUser = vi.fn();
      expect(
        run(UiStates.VEHICLE_MANAGER, undefined, { prompt, setJwt, setUser }),
      ).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
      expect(setJwt).not.toHaveBeenCalled();
      expect(setUser).not.toHaveBeenCalled();
      expect(localStorage.getItem(`user_data_${CLIENT_ID}`)).not.toBeNull();
    },
  );

  it('prompt keeps an embedded login from posting the cached session', () => {
    signIn();
    const onReturningLogin = vi.fn();
    run(UiStates.EMAIL_INPUT, onReturningLogin, { prompt: 'select_account' });
    expect(onReturningLogin).not.toHaveBeenCalled();
  });

  it('a loginHint for the cached account uses the session', () => {
    signIn();
    expect(
      run(UiStates.VEHICLE_MANAGER, undefined, { loginHint: 'JUN@example.com' }),
    ).toHaveBeenCalledWith(UiStates.VEHICLE_MANAGER);
  });

  it('a loginHint for another account does not', () => {
    signIn();
    const setJwt = vi.fn();
    expect(
      run(UiStates.VEHICLE_MANAGER, undefined, {
        loginHint: 'other@example.com',
        setJwt,
      }),
    ).toHaveBeenCalledWith(UiStates.EMAIL_INPUT);
    expect(setJwt).not.toHaveBeenCalled();
  });

  it('prompt does not get in the way of a logout', () => {
    signIn();
    expect(run(UiStates.LOGOUT, undefined, { prompt: 'login' })).toHaveBeenCalledWith(
      UiStates.LOGOUT,
    );
  });
});
