import type { Mock } from 'vitest';
import {
  addAuthenticator,
  createAccount,
  fetchUserDetails,
  registerAccount,
  verifyAccountEmail,
} from '../accountsService';

const ok = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body } as unknown as Response);

const fail = (status: number, body: unknown): Response =>
  ({ ok: false, status, json: async () => body } as unknown as Response);

const ARGS = {
  email: 'a@b.co',
  otpId: 'otp-1',
  otpCode: '123456',
  key: 'pub',
  attestation: { credentialId: 'c' },
  challenge: 'ch',
};

describe('accountsService verified sign-up calls', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    (global as unknown as { fetch: Mock }).fetch = fetchMock;
  });

  it('registerAccount asks for a code without deploying anything', async () => {
    fetchMock.mockResolvedValue(ok({ otpId: 'otp-1' }));
    await expect(registerAccount('a@b.co', 'pub')).resolves.toEqual({ otpId: 'otp-1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/account\/email$/);
    expect(JSON.parse(init.body)).toEqual({
      email: 'a@b.co',
      key: 'pub',
      origin: 'DIMO',
      deployAccount: false,
    });
  });

  it('verifyAccountEmail sends the code and the passkey together', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await verifyAccountEmail(ARGS);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/account\/verify-email$/);
    expect(JSON.parse(init.body)).toEqual({
      email: 'a@b.co',
      otpId: 'otp-1',
      otpCode: '123456',
      key: 'pub',
      attestation: { credentialId: 'c' },
      encodedChallenge: 'ch',
      deployAccount: true,
    });
  });

  it('verifyAccountEmail throws AccountVerifyError with the server reason', async () => {
    fetchMock.mockResolvedValue(fail(400, { error: 'Invalid OTP code' }));
    await expect(verifyAccountEmail(ARGS)).rejects.toMatchObject({
      name: 'AccountVerifyError',
      message: 'Invalid OTP code',
    });
  });

  it('createAccount sends the proof token when given one', async () => {
    fetchMock.mockResolvedValue(ok({ subOrganizationId: 's', hasPasskey: true }));
    await createAccount({
      email: 'a@b.co',
      apiKey: 'k',
      attestation: {},
      challenge: 'ch',
      deployAccount: true,
      proofToken: 'tok',
    });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('fetchUserDetails reports an unverified account and encodes the email', async () => {
    fetchMock.mockResolvedValue(
      ok({ subOrganizationId: 's', hasPasskey: false, emailVerified: false }),
    );
    await expect(fetchUserDetails('a+b@c.co')).resolves.toMatchObject({ emailVerified: false });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/account\/a%2Bb%40c\.co$/);
  });

  it('fetchUserDetails passes on the recorded passkeys’ credential IDs', async () => {
    fetchMock.mockResolvedValue(
      ok({
        subOrganizationId: 's',
        hasPasskey: true,
        emailVerified: true,
        authenticators: [
          { credentialId: 'cred-1', transports: [], creationDate: '2025-01-01' },
          { credentialId: 'cred-2', transports: [], creationDate: '2025-02-01' },
        ],
      }),
    );
    await expect(fetchUserDetails('a@b.co')).resolves.toMatchObject({
      credentialIds: ['cred-1', 'cred-2'],
    });
  });

  it('fetchUserDetails leaves credentialIds out when the API sends no list', async () => {
    fetchMock.mockResolvedValue(ok({ subOrganizationId: 's', hasPasskey: true }));
    const user = await fetchUserDetails('a@b.co');
    expect(user).not.toHaveProperty('credentialIds');
  });
});

describe('addAuthenticator', () => {
  let fetchMock: Mock;
  const SIGNED = {
    url: 'https://api.turnkey.com/public/v1/submit/create_authenticators',
    body: '{"type":"ACTIVITY_TYPE_CREATE_AUTHENTICATORS_V2"}',
    stamp: { stampHeaderName: 'X-Stamp', stampHeaderValue: 'stamp' },
  };

  beforeEach(() => {
    fetchMock = vi.fn();
    (global as unknown as { fetch: Mock }).fetch = fetchMock;
  });

  it('posts the email and the signed request, with no bearer token', async () => {
    fetchMock.mockResolvedValue({ ...ok({ subOrganizationId: 's' }), status: 201 });
    await addAuthenticator('a@b.co', SIGNED);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/account\/authenticator$/);
    expect(init.method).toBe('POST');
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(init.body)).toEqual({
      email: 'a@b.co',
      signedCreateAuthenticatorsRequest: SIGNED,
    });
  });

  it('throws with the server’s reason', async () => {
    fetchMock.mockResolvedValue(
      fail(409, { error: 'Existing passkeys are not recorded' }),
    );
    await expect(addAuthenticator('a@b.co', SIGNED)).rejects.toThrow(
      'Existing passkeys are not recorded',
    );
  });

  it('throws even when the error body isn’t JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('not json');
      },
    });
    await expect(addAuthenticator('a@b.co', SIGNED)).rejects.toThrow(
      'Could not add the passkey',
    );
  });
});
