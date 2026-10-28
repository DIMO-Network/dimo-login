import { UiStates } from '../../enums';
import { initializeSession } from '../sessionService';

const CLIENT_ID = '0xb92d74B468B4047289AEa7c9B953066E39768C16';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
const JWT = `${b64({ alg: 'HS256' })}.${b64({ exp: 4102444800 })}.sig`;
const USER = { email: 'jun@example.com', smartContractAddress: '0xabc' };

const signIn = () => {
  document.cookie = `auth_token_${CLIENT_ID}=${JWT}; path=/`;
  localStorage.setItem(`user_data_${CLIENT_ID}`, JSON.stringify(USER));
};

const run = (entryState: UiStates, onReturningLogin?: jest.Mock) => {
  const setUiState = jest.fn();
  initializeSession({
    clientId: CLIENT_ID,
    setJwt: jest.fn(),
    setUser: jest.fn(),
    uiState: UiStates.EMAIL_INPUT,
    setUiState,
    entryState,
    onReturningLogin,
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
    const onReturningLogin = jest.fn();
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
});
