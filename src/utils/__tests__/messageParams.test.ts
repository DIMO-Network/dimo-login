import { filterMessageParams, ALLOWED_MESSAGE_PARAM_KEYS } from '../messageParams';

describe('filterMessageParams', () => {
  it('keeps known SDK contract keys', () => {
    const input = {
      clientId: '0xabc',
      redirectUri: 'https://app.example.com',
      brandName: 'GM',
      permissions: '1,2,3',
      transactionData: { foo: 'bar' },
    };
    expect(filterMessageParams(input)).toEqual(input);
  });

  it('drops keys outside the allowlist', () => {
    const result = filterMessageParams({
      clientId: '0xabc',
      somethingMalicious: 'pwn',
    });
    expect(result).toEqual({ clientId: '0xabc' });
    expect('somethingMalicious' in result).toBe(false);
  });

  it('drops internal control flags that must never come from the wire', () => {
    const result = filterMessageParams({
      clientId: '0xabc',
      waitingForDevLicense: false,
      invalidCredentials: false,
      oemBrand: { name: 'EvilCorp', logoUrl: 'https://evil/logo.svg' },
      devLicenseAlias: 'spoofed',
    });
    expect(result).toEqual({ clientId: '0xabc' });
  });

  it('returns an empty object when nothing is allowlisted', () => {
    expect(filterMessageParams({ junk: 1, more: 2 })).toEqual({});
  });

  it('allowlist covers the keys the app acts on', () => {
    // Guards against accidentally dropping a legitimate flow's key.
    [
      'clientId',
      'redirectUri',
      'brandName',
      'entryState',
      'permissionTemplateId',
      'permissions',
      'vehicles',
      'vehicleMakes',
      'powertrainTypes',
      'expirationDate',
      'region',
      'onboarding',
      'cloudEvent',
      'transactionData',
      'messageData',
      'tosUrl',
    ].forEach((key) => expect(ALLOWED_MESSAGE_PARAM_KEYS.has(key)).toBe(true));
  });
});
