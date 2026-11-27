/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
/**
 * One Turnkey session stamper for both stacks. The real turnkeyService runs over
 * a stand-in KernelSigner (state kept as in 0.4.1: openSessionWithApiStamper
 * opens an API-key session, passkeyToSession a passkey one) and a stand-in
 * Turnkey client that asks the passkey for one stamp per activity.
 */
const turnkey = vi.hoisted(() => {
  const state = {
    webauthnStamps: 0,
    activities: [] as unknown[],
    kernel: undefined as undefined | InstanceType<typeof FakeKernelSigner>,
  };
  class FakeKernelSigner {
    config = {
      turnkeyApiBaseUrl: 'https://api.turnkey.example',
      sessionTimeoutSeconds: '900',
    };
    apiSessionClient = { expires: 0 };
    passkeySessionClient = { expires: 0 };
    openedWith: unknown[] = [];
    passkeyToSession = vi.fn();
    constructor() {
      state.kernel = this;
    }
    resetClient() {
      this.apiSessionClient = { expires: 0 };
      this.passkeySessionClient = { expires: 0 };
      return true;
    }
    async openSessionWithApiStamper(sub: string, stamper: unknown) {
      this.openedWith.push([sub, stamper]);
      this.apiSessionClient = { expires: Date.now() + 675_000 };
    }
  }
  return { state, FakeKernelSigner };
});

vi.mock('@dimo-network/transactions', () => ({
  KernelSigner: turnkey.FakeKernelSigner,
  newKernelConfig: (config: unknown) => config,
}));
vi.mock('@dimo-network/transactions/dist/core/types/args', () => ({}));
vi.mock('@turnkey/webauthn-stamper', () => ({
  WebauthnStamper: class {
    stamp = async () => {
      turnkey.state.webauthnStamps += 1;
      return { stampHeaderName: 'X-Stamp-Webauthn', stampHeaderValue: 'stamp' };
    };
  },
}));
vi.mock('@turnkey/http', () => ({
  getWebAuthnAttestation: vi.fn(),
  TurnkeyClient: class {
    constructor(
      public config: unknown,
      public stamper: { stamp: (payload: string) => Promise<unknown> },
    ) {}
    async createReadWriteSession(activity: unknown) {
      turnkey.state.activities.push(activity);
      await this.stamper.stamp('payload');
      return {
        activity: {
          result: { createReadWriteSessionResultV2: { credentialBundle: 'bundle' } },
        },
      };
    }
  },
}));
vi.mock('@turnkey/crypto', () => ({
  generateP256KeyPair: () => ({
    publicKeyUncompressed: 'ephemeral-pub',
    privateKey: 'ephemeral-priv',
  }),
  decryptCredentialBundle: (bundle: string, key: string) =>
    `session-key(${bundle},${key})`,
  getPublicKey: () => new Uint8Array([1, 2, 3]),
}));
vi.mock('@turnkey/api-key-stamper', () => ({
  ApiKeyStamper: class {
    constructor(public keys: { apiPublicKey: string; apiPrivateKey: string }) {}
  },
}));
vi.mock('../../utils/messageHandler', () => ({
  backToThirdParty: vi.fn(),
  sendMessageToReferrer: vi.fn(),
}));
vi.mock('@turnkey/encoding', () => ({ uint8ArrayToHexString: () => '010203' }));

import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import {
  createKernelSigner,
  createPasskeySession,
  getApiKeyStamper,
  getKernelSigner,
  getSessionStamper,
  initializePasskey,
} from '../turnkeyService';
import { clearSessionStamper } from '../sessionStamper';
import { logout } from '../../utils/authUtils';

const SUB = 'sub-alice';

beforeEach(() => {
  turnkey.state.webauthnStamps = 0;
  turnkey.state.activities = [];
  localStorage.clear();
  sessionStorage.clear();
  clearSessionStamper();
  createKernelSigner('0xc', 'https://app.example', 'https://app.example/cb');
});
afterEach(() => {
  delete process.env.REACT_APP_ACCOUNTS_V2_SENDS;
});

const kernel = () => turnkey.state.kernel!;

describe('with ACCOUNTS_V2_SENDS on', () => {
  beforeEach(() => {
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
  });

  it('signs in by passkey with one WebAuthn stamp and keeps the session stamper', async () => {
    const before = Date.now();
    const expiresAt = await initializePasskey(SUB);

    expect(turnkey.state.webauthnStamps).toBe(1);
    expect(kernel().openedWith).toHaveLength(1);
    expect(kernel().passkeyToSession).not.toHaveBeenCalled();
    expect(kernel().openedWith[0]).toEqual([SUB, getSessionStamper()]);
    expect(getSessionStamper()).toBeInstanceOf(ApiKeyStamper);
    // The signer's own lifetime: 75% of the 900 s session.
    expect(expiresAt).toBeGreaterThanOrEqual(before + 675_000);
    expect(expiresAt).toBeLessThan(Date.now() + 675_000 + 1);
  });

  it('asks Turnkey for the same activity KernelSigner does', async () => {
    await createPasskeySession(SUB);

    expect(turnkey.state.activities).toEqual([
      {
        organizationId: SUB,
        type: 'ACTIVITY_TYPE_CREATE_READ_WRITE_SESSION_V2',
        timestampMs: expect.stringMatching(/^\d+$/),
        parameters: { targetPublicKey: 'ephemeral-pub', expirationSeconds: '900' },
      },
    ]);
  });

  it('decrypts the bundle with the fresh key into the stamper', async () => {
    const { stamper } = await createPasskeySession(SUB);

    expect(stamper).toBeInstanceOf(ApiKeyStamper);
    expect((stamper as unknown as { keys: unknown }).keys).toEqual({
      apiPublicKey: '010203',
      apiPrivateKey: 'session-key(bundle,ephemeral-priv)',
    });
  });

  it('stores nothing: no key material reaches web storage', async () => {
    await initializePasskey(SUB);

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe('with ACCOUNTS_V2_SENDS off', () => {
  it('leaves the signer to open its own passkey session', async () => {
    kernel().passkeyToSession.mockImplementation(async () => {
      kernel().passkeySessionClient = { expires: 4242 };
    });

    const expiresAt = await initializePasskey(SUB);

    expect(kernel().passkeyToSession).toHaveBeenCalledTimes(1);
    expect(kernel().passkeyToSession.mock.calls[0][0]).toBe(SUB);
    expect(expiresAt).toBe(4242);
    expect(turnkey.state.activities).toEqual([]);
    expect(turnkey.state.webauthnStamps).toBe(0);
    expect(getSessionStamper()).toBeNull();
  });
});

describe('the email-code session', () => {
  it('is the session stamper', async () => {
    const stamper = getApiKeyStamper({ credentialBundle: 'b', embeddedKey: 'k' });

    await getKernelSigner().openSessionWithApiStamper(SUB, stamper);

    expect(getSessionStamper()).toBe(stamper);
  });
});

describe('ending the session', () => {
  const openSession = async () => {
    await getKernelSigner().openSessionWithApiStamper(
      SUB,
      getApiKeyStamper({ credentialBundle: 'b', embeddedKey: 'k' }),
    );
    expect(getSessionStamper()).not.toBeNull();
  };

  it('resetClient clears it', async () => {
    await openSession();
    getKernelSigner().resetClient();
    expect(getSessionStamper()).toBeNull();
  });

  it('logout clears it', async () => {
    await openSession();
    logout('0xc', 'https://app.example/cb', '', vi.fn());
    expect(getSessionStamper()).toBeNull();
  });
});
