/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
const turnkey = vi.hoisted(() => ({
  whoami: vi.fn(),
  stamp: vi.fn(),
  clientConfig: [] as unknown[],
}));
vi.mock('@turnkey/http', () => ({
  TurnkeyClient: class {
    constructor(config: unknown, stamper: unknown) {
      turnkey.clientConfig.push({ config, stamper });
    }
    getWhoami = turnkey.whoami;
    stampCreateAuthenticators = turnkey.stamp;
  },
}));
vi.mock('../turnkeyService', () => ({
  createPasskey: vi.fn(),
  getApiKeyStamper: vi.fn(),
  getKernelSigner: () => ({
    config: { turnkeyApiBaseUrl: 'https://api.turnkey.example' },
  }),
}));

import { enrollPasskey, prepareEnrollment } from '../passkeyEnrollment';
import { createPasskey, getApiKeyStamper } from '../turnkeyService';

/** A live email-code session, as of when it is made. */
const session = (expiresIn = 60_000) =>
  ({
    sessionType: 'api_key',
    embeddedKey: 'key',
    credentialBundle: 'bundle',
    expiresAt: Date.now() + expiresIn,
  }) as const;

beforeEach(() => {
  turnkey.clientConfig = [];
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('prepareEnrollment', () => {
  it('asks Turnkey who the account’s own email-code session is', async () => {
    vi.mocked(getApiKeyStamper).mockReturnValue({ stamp: 'api' } as never);
    turnkey.whoami.mockResolvedValue({ organizationId: 'sub-jun', userId: 'user-1' });

    const prepared = await prepareEnrollment(session(), 'sub-jun', ['cred-other-device']);

    expect(getApiKeyStamper).toHaveBeenCalledWith({
      credentialBundle: 'bundle',
      embeddedKey: 'key',
    });
    expect(turnkey.clientConfig).toEqual([
      { config: { baseUrl: 'https://api.turnkey.example' }, stamper: { stamp: 'api' } },
    ]);
    expect(turnkey.whoami).toHaveBeenCalledWith({ organizationId: 'sub-jun' });
    expect(prepared).toMatchObject({
      userId: 'user-1',
      subOrganizationId: 'sub-jun',
      excludeCredentialIds: ['cred-other-device'],
    });
  });

  it.each([
    ['no session', () => null],
    [
      'a passkey session',
      () => ({ sessionType: 'passkey', expiresAt: Date.now() + 60_000 }),
    ],
    ['an expired key', () => session(-1)],
  ])('refuses with %s', async (_, made) => {
    await expect(prepareEnrollment(made() as never, 'sub-jun', [])).rejects.toThrow();
    expect(turnkey.whoami).not.toHaveBeenCalled();
  });

  it('refuses when Turnkey answers for another organization', async () => {
    turnkey.whoami.mockResolvedValue({ organizationId: 'sub-other', userId: 'user-1' });
    await expect(prepareEnrollment(session(), 'sub-jun', [])).rejects.toThrow();
  });
});

describe('enrollPasskey', () => {
  const prepared = () => ({
    client: { stampCreateAuthenticators: turnkey.stamp },
    userId: 'user-1',
    subOrganizationId: 'sub-jun',
    excludeCredentialIds: ['cred-other-device'],
  });
  const ATTESTATION = {
    credentialId: 'new',
    clientDataJson: 'cd',
    attestationObject: 'ao',
    transports: ['AUTHENTICATOR_TRANSPORT_INTERNAL'],
  };

  it('makes the passkey and stamps its creation for the account’s Turnkey user', async () => {
    vi.mocked(createPasskey).mockResolvedValue([ATTESTATION, 'challenge']);
    turnkey.stamp.mockResolvedValue({ url: 'u', body: 'b', stamp: 's' });
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    await expect(enrollPasskey(prepared() as never, 'jun@example.com')).resolves.toEqual({
      url: 'u',
      body: 'b',
      stamp: 's',
    });

    expect(createPasskey).toHaveBeenCalledWith('jun@example.com', {
      excludeCredentialIds: ['cred-other-device'],
    });
    expect(turnkey.stamp).toHaveBeenCalledWith({
      type: 'ACTIVITY_TYPE_CREATE_AUTHENTICATORS_V2',
      timestampMs: '1700000000000',
      organizationId: 'sub-jun',
      parameters: {
        userId: 'user-1',
        authenticators: [
          {
            authenticatorName: 'DIMO PASSKEY',
            challenge: 'challenge',
            attestation: ATTESTATION,
          },
        ],
      },
    });
  });

  it('asks for the passkey before anything else, inside the click', () => {
    // Safari only opens the prompt while the click is still being handled.
    vi.mocked(createPasskey).mockReturnValue(new Promise(() => {}));
    void enrollPasskey(prepared() as never, 'jun@example.com');
    expect(createPasskey).toHaveBeenCalledTimes(1);
  });

  it('stamps nothing when the passkey isn’t made', async () => {
    vi.mocked(createPasskey).mockRejectedValue(new DOMException('', 'NotAllowedError'));
    await expect(enrollPasskey(prepared() as never, 'jun@example.com')).rejects.toThrow();
    expect(turnkey.stamp).not.toHaveBeenCalled();
  });
});
