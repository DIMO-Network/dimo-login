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
    stampGate: undefined as Promise<void> | undefined,
    openGate: undefined as Promise<void> | undefined,
    failNextOpen: false,
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
    async getActiveClient() {
      if (this.apiSessionClient.expires > Date.now()) return 'api-client';
      throw new Error('No active client');
    }
    async openSessionWithApiStamper(sub: string, stamper: unknown) {
      // The real one makes three network calls before it sets the expiry.
      await state.openGate;
      if (state.failNextOpen) {
        state.failNextOpen = false;
        throw new Error('network');
      }
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
      await turnkey.state.stampGate;
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
  turnkey.state.stampGate = undefined;
  turnkey.state.openGate = undefined;
  turnkey.state.failNextOpen = false;
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

describe('a session that has lapsed', () => {
  const lapse = () => {
    kernel().apiSessionClient = { expires: Date.now() - 1 };
  };

  describe('from a passkey sign-in with ACCOUNTS_V2_SENDS on', () => {
    beforeEach(async () => {
      process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
      await initializePasskey(SUB);
    });

    it('is reopened with one new passkey stamp at the next signing call', async () => {
      const first = getSessionStamper();
      lapse();

      await expect(getKernelSigner().getActiveClient()).resolves.toBe('api-client');

      expect(turnkey.state.webauthnStamps).toBe(2);
      expect(kernel().openedWith).toHaveLength(2);
      expect(getSessionStamper()).not.toBeNull();
      expect(getSessionStamper()).not.toBe(first);
      expect(getSessionStamper()).toBe((kernel().openedWith[1] as unknown[])[1]);
    });

    it('makes one stamp for calls that overlap', async () => {
      lapse();
      await Promise.all([
        getKernelSigner().getActiveClient(),
        getKernelSigner().getActiveClient(),
      ]);
      expect(turnkey.state.webauthnStamps).toBe(2);
    });

    it('lets a call that arrives while the session is opening wait for it', async () => {
      lapse();
      let release!: () => void;
      turnkey.state.openGate = new Promise((resolve) => (release = resolve));

      const first = getKernelSigner().getActiveClient();
      await vi.waitFor(() => expect(turnkey.state.webauthnStamps).toBe(2));
      const second = getKernelSigner().getActiveClient();
      release();

      await expect(Promise.all([first, second])).resolves.toEqual([
        'api-client',
        'api-client',
      ]);
      expect(turnkey.state.webauthnStamps).toBe(2);
    });

    it('prompts again at the next call after a failed reopen', async () => {
      lapse();
      turnkey.state.failNextOpen = true;
      await expect(getKernelSigner().getActiveClient()).rejects.toThrow('network');

      await expect(getKernelSigner().getActiveClient()).resolves.toBe('api-client');
      expect(turnkey.state.webauthnStamps).toBe(3);
    });

    it('opens nothing when logout comes while the prompt is open', async () => {
      lapse();
      let release!: () => void;
      turnkey.state.stampGate = new Promise((resolve) => (release = resolve));
      const call = getKernelSigner().getActiveClient();
      const rejected = expect(call).rejects.toThrow('Session ended');

      logout('0xc', 'https://app.example/cb', '', vi.fn());
      release();

      await rejected;
      expect(getSessionStamper()).toBeNull();
      expect(kernel().openedWith).toHaveLength(1);
      expect(kernel().apiSessionClient.expires).toBeLessThanOrEqual(Date.now());
    });

    it('opens nothing when the signer is reset while the prompt is open', async () => {
      lapse();
      let release!: () => void;
      turnkey.state.stampGate = new Promise((resolve) => (release = resolve));
      const rejected = expect(getKernelSigner().getActiveClient()).rejects.toThrow(
        'Session ended',
      );

      getKernelSigner().resetClient();
      release();

      await rejected;
      expect(getSessionStamper()).toBeNull();
      expect(kernel().openedWith).toHaveLength(1);
    });

    it('makes no new stamp before it expires', async () => {
      await getKernelSigner().getActiveClient();
      expect(turnkey.state.webauthnStamps).toBe(1);
    });

    it('has no session stamper once expired, until it is reopened', () => {
      lapse();
      // The stamper's own expiry is the one stored with it.
      vi.useFakeTimers({ now: Date.now() + 676_000 });
      try {
        expect(getSessionStamper()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('from an email code', () => {
    it('stays as it is today: no client, no prompt', async () => {
      process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
      await getKernelSigner().openSessionWithApiStamper(
        SUB,
        getApiKeyStamper({ credentialBundle: 'b', embeddedKey: 'k' }),
      );
      lapse();

      await expect(getKernelSigner().getActiveClient()).rejects.toThrow(
        'No active client',
      );
      expect(turnkey.state.webauthnStamps).toBe(0);
    });
  });
});
