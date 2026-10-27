import { isEmailGranted, setEmailGranted, setLoggedEmail } from '../storageService';

const CLIENT_ID = '0xb92d74B468B4047289AEa7c9B953066E39768C16';

beforeEach(() => localStorage.clear());

describe('email sharing choice', () => {
  it('is stored per account, so one person’s consent never shares another’s email', () => {
    setEmailGranted(CLIENT_ID, 'jun@example.com', true);

    expect(isEmailGranted(CLIENT_ID, 'jun@example.com')).toBe(true);
    expect(isEmailGranted(CLIENT_ID, 'Jun@Example.com ')).toBe(true);
    expect(isEmailGranted(CLIENT_ID, 'someone.else@example.com')).toBe(false);
  });

  it('records a no as well as a yes', () => {
    setEmailGranted(CLIENT_ID, 'jun@example.com', true);
    setEmailGranted(CLIENT_ID, 'jun@example.com', false);

    expect(isEmailGranted(CLIENT_ID, 'jun@example.com')).toBe(false);
  });

  it('is not stored without an app or an account', () => {
    setEmailGranted(null, 'jun@example.com', true);
    setEmailGranted(CLIENT_ID, undefined, true);

    expect(localStorage.length).toBe(0);
    expect(isEmailGranted(null, 'jun@example.com')).toBe(false);
  });

  it('honours a grant saved before grants were per account, for that account only', () => {
    localStorage.setItem(`email_granted_${CLIENT_ID}`, 'true');
    setLoggedEmail(CLIENT_ID, 'jun@example.com');

    expect(isEmailGranted(CLIENT_ID, 'jun@example.com')).toBe(true);
    expect(isEmailGranted(CLIENT_ID, 'someone.else@example.com')).toBe(false);
  });
});
