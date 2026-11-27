/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
/**
 * validateSession, the check signing screens run first, over the real sign-in
 * steps and the real turnkeyService (its session stamper included). The
 * KernelSigner underneath is a stand-in that keeps session state as 0.4.1 does,
 * and the passkey is a stand-in that counts its stamps.
 */
import React from 'react';
import { act, render } from '@testing-library/react';
import type { Mock } from 'vitest';

const wallet = vi.hoisted(() => {
  const SESSION_MS = 675_000; // 75% of the 900 s session, as KernelSigner keeps it
  const state = {
    webauthnStamps: 0,
    resets: 0,
    opens: [] as string[],
    openGate: undefined as Promise<void> | undefined,
    kernel: undefined as undefined | InstanceType<typeof FakeKernelSigner>,
  };
  class FakeKernelSigner {
    config = {
      turnkeyApiBaseUrl: 'https://api.turnkey.example',
      sessionTimeoutSeconds: '900',
    };
    subOrganizationId?: string;
    apiSessionClient = { expires: 0 };
    passkeySessionClient = { expires: 0 };
    passkeyClient = { valid: false };
    passkeyToSession = vi.fn(async (sub: string) => {
      this.subOrganizationId = sub;
      this.passkeyClient = { valid: true };
      this.passkeySessionClient = { expires: Date.now() + SESSION_MS };
    });
    constructor() {
      state.kernel = this;
    }
    resetClient() {
      state.resets += 1;
      this.subOrganizationId = undefined;
      this.apiSessionClient = { expires: 0 };
      this.passkeySessionClient = { expires: 0 };
      this.passkeyClient = { valid: false };
      return true;
    }
    hasActiveSession() {
      const now = Date.now();
      return (
        this.apiSessionClient.expires > now ||
        this.passkeySessionClient.expires > now ||
        this.passkeyClient.valid
      );
    }
    async openSessionWithApiStamper(sub: string) {
      // The real one makes three network calls before it sets the session.
      await state.openGate;
      state.opens.push(sub);
      this.subOrganizationId = sub;
      this.apiSessionClient = { expires: Date.now() + SESSION_MS };
    }
  }
  return { state, FakeKernelSigner, SESSION_MS };
});

vi.mock('@dimo-network/transactions', () => ({
  KernelSigner: wallet.FakeKernelSigner,
  newKernelConfig: (config: unknown) => config,
}));
vi.mock('@dimo-network/transactions/dist/core/types/args', () => ({}));
vi.mock('@turnkey/webauthn-stamper', () => ({
  WebauthnStamper: class {
    stamp = async () => {
      wallet.state.webauthnStamps += 1;
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
    async createReadWriteSession() {
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
vi.mock('@turnkey/encoding', () => ({ uint8ArrayToHexString: () => '010203' }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('../DevCredentialsContext', () => ({ useDevCredentials: vi.fn() }));
vi.mock('../UIManagerContext', () => ({ useUIManager: vi.fn() }));
vi.mock('../../services/walletLoader', () => ({
  signInStepsWithSigner: vi.fn(),
  loadSignInSteps: vi.fn(),
}));
vi.mock('../../utils/messageHandler', () => ({
  backToThirdParty: vi.fn(),
  sendMessageToReferrer: vi.fn(),
}));
vi.mock('../../services/authService', () => ({
  generateChallenge: vi.fn(),
  submitWeb3Challenge: vi.fn(),
}));

import { captureException } from '@sentry/react';

import { AuthProvider, useAuthContext } from '../AuthContext';
import { useDevCredentials } from '../DevCredentialsContext';
import { useUIManager } from '../UIManagerContext';
import { UiStates } from '../../enums';
import type { UserObject } from '../../models/user';
import { getWalletSession, setWalletSession } from '../../services/accountStore';
import {
  clearSessionStamper,
  getSessionStamper,
  getSessionStamperExpiry,
} from '../../services/sessionStamper';
import * as signInSteps from '../../services/signInSteps';
import {
  createKernelSigner,
  getApiKeyStamper,
  getKernelSigner,
  initializePasskey,
} from '../../services/turnkeyService';
import { signInStepsWithSigner } from '../../services/walletLoader';

const SUB = 'sub-alice';
const ALICE: UserObject = {
  email: 'alice@x.co',
  subOrganizationId: SUB,
  hasPasskey: true,
  walletAddress: null,
  smartContractAddress: null,
  emailVerified: true,
};

let auth: ReturnType<typeof useAuthContext>;
const Probe = () => {
  auth = useAuthContext();
  return null;
};
let setUiState: Mock;

const validate = async () => {
  let valid: boolean | null = null;
  await act(async () => {
    valid = await auth.validateSession();
  });
  return valid;
};

beforeEach(() => {
  localStorage.clear();
  wallet.state.webauthnStamps = 0;
  wallet.state.resets = 0;
  wallet.state.opens = [];
  wallet.state.openGate = undefined;
  clearSessionStamper();
  createKernelSigner('0xc', 'https://app.example', 'https://app.example/cb');
  setUiState = vi.fn();
  (useDevCredentials as Mock).mockReturnValue({
    clientId: '0xc',
    redirectUri: 'https://app.example/cb',
    utm: '',
  });
  (useUIManager as Mock).mockReturnValue({
    setUiState,
    setError: vi.fn(),
    entryState: 'VEHICLE_MANAGER',
  });
  (signInStepsWithSigner as Mock).mockResolvedValue(signInSteps);
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  act(() => auth.setUser(ALICE));
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.REACT_APP_ACCOUNTS_V2_SENDS;
});

describe('a passkey session near its end', () => {
  /** Signs Alice in by passkey, then moves the clock to `left` ms before the session ends. */
  const signInByPasskey = async (left: number) => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-27T12:00:00Z') });
    const expiresAt = await initializePasskey(SUB);
    setWalletSession(SUB, { sessionType: 'passkey', expiresAt });
    vi.setSystemTime(expiresAt - left);
    return expiresAt;
  };

  describe('with ACCOUNTS_V2_SENDS on', () => {
    beforeEach(() => {
      process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    });

    it('is renewed with one passkey prompt when less than 180 s is left', async () => {
      await signInByPasskey(100_000);
      expect(wallet.state.webauthnStamps).toBe(1);

      expect(await validate()).toBe(true);

      expect(wallet.state.webauthnStamps).toBe(2);
      expect(wallet.state.opens).toEqual([SUB, SUB]);
      // A whole session again, for the stamper and the stored record alike.
      expect(getSessionStamperExpiry()).toBe(Date.now() + wallet.SESSION_MS);
      expect(getWalletSession(SUB)).toEqual({
        sessionType: 'passkey',
        expiresAt: getSessionStamperExpiry(),
      });
      expect(setUiState).not.toHaveBeenCalled();
    });

    it('is left as it is with 300 s left', async () => {
      const expiresAt = await signInByPasskey(300_000);

      expect(await validate()).toBe(true);

      expect(wallet.state.webauthnStamps).toBe(1);
      expect(getSessionStamperExpiry()).toBe(expiresAt);
    });
  });

  it('is left as it is with ACCOUNTS_V2_SENDS off', async () => {
    await signInByPasskey(100_000);
    const kernel = wallet.state.kernel!;
    expect(kernel.passkeyToSession).toHaveBeenCalledTimes(1);

    expect(await validate()).toBe(true);

    expect(kernel.passkeyToSession).toHaveBeenCalledTimes(1);
    expect(wallet.state.webauthnStamps).toBe(0);
    expect(wallet.state.opens).toEqual([]);
  });

  it('from an email code is left as it is with ACCOUNTS_V2_SENDS on', async () => {
    process.env.REACT_APP_ACCOUNTS_V2_SENDS = 'true';
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-27T12:00:00Z') });
    await getKernelSigner().openSessionWithApiStamper(
      SUB,
      getApiKeyStamper({ credentialBundle: 'b', embeddedKey: 'k' }),
    );
    const expiresAt = getSessionStamperExpiry()!;
    setWalletSession(SUB, {
      sessionType: 'api_key',
      embeddedKey: 'k',
      credentialBundle: 'b',
      expiresAt,
    });
    vi.setSystemTime(expiresAt - 100_000);

    expect(await validate()).toBe(true);

    expect(wallet.state.webauthnStamps).toBe(0);
    expect(wallet.state.opens).toEqual([SUB]);
    expect(getSessionStamperExpiry()).toBe(expiresAt);
  });
});

describe('two checks that overlap on a reload (flag off)', () => {
  it('share one: one reset, one open, no error and no new code', async () => {
    setWalletSession(SUB, {
      sessionType: 'api_key',
      embeddedKey: 'k',
      credentialBundle: 'b',
      expiresAt: Date.now() + 600_000,
    });
    let release!: () => void;
    wallet.state.openGate = new Promise((resolve) => (release = resolve));

    let results: Array<boolean | null> = [];
    await act(async () => {
      const both = Promise.all([auth.validateSession(), auth.validateSession()]);
      // Both are under way, and the first is opening the session.
      await new Promise((resolve) => setTimeout(resolve, 0));
      release();
      results = await both;
    });

    expect(results).toEqual([true, true]);
    expect(wallet.state.resets).toBe(1);
    expect(wallet.state.opens).toEqual([SUB]);
    expect(getSessionStamper()).not.toBeNull();
    expect(captureException).not.toHaveBeenCalled();
    expect(setUiState).not.toHaveBeenCalledWith(UiStates.OTP_INPUT);
    expect(getWalletSession(SUB)).not.toBeNull();
  });

  it('runs again once the first has finished', async () => {
    setWalletSession(SUB, {
      sessionType: 'api_key',
      embeddedKey: 'k',
      credentialBundle: 'b',
      expiresAt: Date.now() + 600_000,
    });

    expect(await validate()).toBe(true);
    getKernelSigner().resetClient();
    expect(await validate()).toBe(true);

    expect(wallet.state.opens).toEqual([SUB, SUB]);
  });
});
