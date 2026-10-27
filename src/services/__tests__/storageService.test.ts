import {
  clearLoggedEmail,
  getEmailChoice,
  isEmailGranted,
  setEmailGranted,
  setLoggedEmail,
} from '../storageService';

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

  // Before grants were per account, one key per app held the answer of the
  // account last signed in (logged_email_<clientId>).
  const legacyGrant = (owner: string, value: string) => {
    localStorage.setItem(`logged_email_${CLIENT_ID}`, owner);
    localStorage.setItem(`email_granted_${CLIENT_ID}`, value);
  };

  it('keeps an old grant for the account it belonged to', () => {
    legacyGrant('jun@example.com', 'true');

    expect(isEmailGranted(CLIENT_ID, 'jun@example.com')).toBe(true);
    expect(isEmailGranted(CLIENT_ID, 'someone.else@example.com')).toBe(false);
    expect(localStorage.getItem(`email_granted_${CLIENT_ID}`)).toBeNull();
  });

  it('never hands an old grant to the next account that signs in', () => {
    legacyGrant('jun@example.com', 'true');
    // Signing in as someone else records them as the logged account first.
    setLoggedEmail(CLIENT_ID, 'someone.else@example.com');

    expect(getEmailChoice(CLIENT_ID, 'someone.else@example.com')).toBeUndefined();
    expect(isEmailGranted(CLIENT_ID, 'jun@example.com')).toBe(true);
  });

  it('keeps an old grant through "Use another account"', () => {
    legacyGrant('jun@example.com', 'false');
    clearLoggedEmail(CLIENT_ID);
    setLoggedEmail(CLIENT_ID, 'someone.else@example.com');

    expect(getEmailChoice(CLIENT_ID, 'someone.else@example.com')).toBeUndefined();
    expect(getEmailChoice(CLIENT_ID, 'jun@example.com')).toBe(false);
  });

  it('drops an old grant it can’t attribute, so the user is asked again', () => {
    localStorage.setItem(`email_granted_${CLIENT_ID}`, 'true');
    setLoggedEmail(CLIENT_ID, 'jun@example.com');

    expect(getEmailChoice(CLIENT_ID, 'jun@example.com')).toBeUndefined();
  });

  it('lets a newer answer win over an old grant', () => {
    setEmailGranted(CLIENT_ID, 'jun@example.com', false);
    legacyGrant('jun@example.com', 'true');

    expect(getEmailChoice(CLIENT_ID, 'jun@example.com')).toBe(false);
  });
});
