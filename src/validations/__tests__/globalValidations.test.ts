import { getGlobalError } from '../globalValidations';

const none = {
  untrustedOAuthReturn: false,
  untrustedCaller: false,
  missingClientId: false,
  missingRedirectUri: false,
  credentialsUnavailable: false,
  invalidCredentials: false,
};

describe('getGlobalError', () => {
  it('says the app couldn’t be checked rather than that it is set up wrong', () => {
    const error = getGlobalError({
      ...none,
      credentialsUnavailable: true,
      invalidCredentials: true,
    });

    expect(error?.title.key).toBe('error.credentials_unavailable.title');
    expect(error?.message.key).toBe('error.credentials_unavailable.message');
  });

  it('has no error when nothing is wrong', () => {
    expect(getGlobalError(none)).toBeUndefined();
  });
});
