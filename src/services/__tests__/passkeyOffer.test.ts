/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
let mockEmbedded = false;
vi.mock('../../utils/isEmbed', () => ({ isEmbed: () => mockEmbedded }));

import type { UserObject } from '../../models/user';
import { snoozePasskeyOffer } from '../accountStore';
import { shouldOfferPasskey } from '../passkeyOffer';

const FLAG = 'REACT_APP_PASSKEY_OFFER';
const ACCOUNT: UserObject = {
  email: 'jun@example.com',
  subOrganizationId: 'sub-jun',
  hasPasskey: true,
  walletAddress: '0xw',
  smartContractAddress: '0xs',
  emailVerified: true,
  credentialIds: ['cred-other-device'],
};

let platformAuthenticator: () => Promise<boolean>;

beforeEach(() => {
  localStorage.clear();
  mockEmbedded = false;
  process.env[FLAG] = 'true';
  platformAuthenticator = async () => true;
  Object.defineProperty(window, 'PublicKeyCredential', {
    configurable: true,
    value: {
      isUserVerifyingPlatformAuthenticatorAvailable: () => platformAuthenticator(),
    },
  });
});
afterEach(() => {
  delete process.env[FLAG];
  Reflect.deleteProperty(window, 'PublicKeyCredential');
});

describe('shouldOfferPasskey', () => {
  it('offers to an account with recorded passkeys, on a device that can hold one', async () => {
    await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(true);
  });

  it('offers to an account with no passkey at all', async () => {
    await expect(
      shouldOfferPasskey({ ...ACCOUNT, hasPasskey: false, credentialIds: [] }),
    ).resolves.toBe(true);
  });

  it.each([undefined, 'false', '1', 'TRUE'])(
    'never offers with the flag %s',
    async (flag) => {
      if (flag === undefined) delete process.env[FLAG];
      else process.env[FLAG] = flag;
      await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(false);
    },
  );

  it('never offers embedded', async () => {
    mockEmbedded = true;
    await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(false);
  });

  it('never offers to an account whose passkeys aren’t recorded', async () => {
    await expect(shouldOfferPasskey({ ...ACCOUNT, credentialIds: [] })).resolves.toBe(
      false,
    );
  });

  it('never offers when the account’s passkeys are unknown', async () => {
    const { credentialIds, ...unknown } = ACCOUNT;
    await expect(shouldOfferPasskey(unknown)).resolves.toBe(false);
  });

  it('never offers once snoozed for the account', async () => {
    snoozePasskeyOffer('sub-jun');
    await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(false);
  });

  it('never offers when storage is blocked, as “Not now” couldn’t be kept', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(false);
    } finally {
      setItem.mockRestore();
    }
  });

  it('never offers on a device with no platform authenticator', async () => {
    platformAuthenticator = async () => false;
    await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(false);
  });

  it('never offers when the browser can’t say, or has no WebAuthn', async () => {
    platformAuthenticator = async () => {
      throw new Error('nope');
    };
    await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(false);
    Reflect.deleteProperty(window, 'PublicKeyCredential');
    await expect(shouldOfferPasskey(ACCOUNT)).resolves.toBe(false);
  });
});
