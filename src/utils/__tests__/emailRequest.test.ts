import {
  needsEmailConsent,
  normalizeEmailRequest,
  resolveEmailRequest,
} from '../emailRequest';
import {
  getEmailChoice,
  setEmailGranted,
  setLoggedEmail,
} from '../../services/storageService';

const CLIENT = '0x2222222222222222222222222222222222222222';
const EMAIL = 'jun@example.com';

beforeEach(() => localStorage.clear());

describe('reading what the app asks for', () => {
  it('accepts the three values and drops anything else', () => {
    expect(normalizeEmailRequest('Required')).toBe('required');
    expect(normalizeEmailRequest(' none ')).toBe('none');
    expect(normalizeEmailRequest('yes')).toBeUndefined();
    expect(normalizeEmailRequest(true)).toBeUndefined();
  });

  it('keeps old apps working: forceEmail means required, nothing means optional', () => {
    expect(resolveEmailRequest(undefined, true)).toBe('required');
    expect(resolveEmailRequest(undefined, false)).toBe('optional');
    expect(resolveEmailRequest(undefined, undefined)).toBe('optional');
    // An explicit emailRequest wins.
    expect(resolveEmailRequest('none', true)).toBe('none');
  });
});

describe('when a plain login asks', () => {
  it('asks once for an optional email, whatever the answer', () => {
    expect(needsEmailConsent(CLIENT, EMAIL, 'optional')).toBe(true);
    setEmailGranted(CLIENT, EMAIL, false);
    expect(needsEmailConsent(CLIENT, EMAIL, 'optional')).toBe(false);
  });

  it('asks for a required email until it is shared', () => {
    setEmailGranted(CLIENT, EMAIL, false);
    expect(needsEmailConsent(CLIENT, EMAIL, 'required')).toBe(true);
    setEmailGranted(CLIENT, EMAIL, true);
    expect(needsEmailConsent(CLIENT, EMAIL, 'required')).toBe(false);
  });

  it('never asks when the app wants no email, or there is none', () => {
    expect(needsEmailConsent(CLIENT, EMAIL, 'none')).toBe(false);
    expect(needsEmailConsent(CLIENT, undefined, 'required')).toBe(false);
  });

  it('counts answers stored before grants were keyed by account', () => {
    localStorage.setItem(`email_granted_${CLIENT}`, 'true');
    setLoggedEmail(CLIENT, EMAIL);
    expect(getEmailChoice(CLIENT, EMAIL)).toBe(true);
    expect(needsEmailConsent(CLIENT, EMAIL, 'required')).toBe(false);
    // Not another account's.
    expect(getEmailChoice(CLIENT, 'someone@example.com')).toBeUndefined();
  });
});
