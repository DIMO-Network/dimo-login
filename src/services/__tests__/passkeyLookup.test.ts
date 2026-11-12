import type { Mock } from 'vitest';

import {
  fetchPasskeyChallenge,
  findAccountByPasskey,
  getPasskeyAssertion,
} from '../passkeyLookup';

const response = (status: number, body: unknown): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const bytes = (...values: number[]) => new Uint8Array(values).buffer;

let fetchMock: Mock;
let credentialsGet: Mock;

beforeEach(() => {
  fetchMock = vi.fn();
  (global as unknown as { fetch: Mock }).fetch = fetchMock;
  credentialsGet = vi.fn();
  Object.defineProperty(navigator, 'credentials', {
    configurable: true,
    value: { get: credentialsGet },
  });
});

describe('fetchPasskeyChallenge', () => {
  it('asks the accounts API for a fresh challenge, never a cached one', async () => {
    const challenge = { challenge: 'AQID', expiresAt: '2027-01-01T00:02:00Z' };
    fetchMock.mockResolvedValue(response(200, challenge));
    await expect(fetchPasskeyChallenge()).resolves.toEqual(challenge);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/account\/passkey-challenge$/);
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store' });
  });

  it('throws when there is no challenge to be had', async () => {
    fetchMock.mockResolvedValue(response(404, { error: 'Not found' }));
    await expect(fetchPasskeyChallenge()).rejects.toThrow();
  });
});

describe('getPasskeyAssertion', () => {
  it('asks for any of this site’s passkeys over the challenge, as bytes', async () => {
    credentialsGet.mockResolvedValue({
      id: 'cred-1',
      response: {
        clientDataJSON: bytes(1, 2, 3),
        authenticatorData: bytes(0xfb, 0xff),
        signature: bytes(4),
      },
    });

    await expect(getPasskeyAssertion('AQID')).resolves.toEqual({
      id: 'cred-1',
      response: { clientDataJSON: 'AQID', authenticatorData: '-_8', signature: 'BA' },
    });

    const { publicKey } = credentialsGet.mock.calls[0][0];
    expect(publicKey).toMatchObject({
      rpId: process.env.REACT_APP_RPCID_URL,
      allowCredentials: [],
      userVerification: 'preferred',
    });
    expect([...publicKey.challenge]).toEqual([1, 2, 3]);
  });

  it('passes the prompt’s refusal on (a cancel, say)', async () => {
    credentialsGet.mockRejectedValue(new DOMException('closed', 'NotAllowedError'));
    await expect(getPasskeyAssertion('AQID')).rejects.toMatchObject({
      name: 'NotAllowedError',
    });
  });

  it('throws when the browser answers with no passkey', async () => {
    credentialsGet.mockResolvedValue(null);
    await expect(getPasskeyAssertion('AQID')).rejects.toThrow();
  });
});

describe('findAccountByPasskey', () => {
  const ASSERTION = {
    id: 'cred-1',
    response: { clientDataJSON: 'cd', authenticatorData: 'ad', signature: 'sig' },
  };

  it('sends the assertion and returns the account it proves', async () => {
    fetchMock.mockResolvedValue(
      response(200, {
        email: 'jun@example.com',
        subOrganizationId: 'sub-jun',
        hasPasskey: true,
        emailVerified: true,
        isDeployed: true,
      }),
    );

    await expect(findAccountByPasskey('AQID', ASSERTION)).resolves.toEqual({
      email: 'jun@example.com',
      subOrganizationId: 'sub-jun',
      hasPasskey: true,
      emailVerified: true,
      smartContractAddress: null,
      walletAddress: null,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/account\/by-passkey$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ challenge: 'AQID', credential: ASSERTION });
  });

  it.each([
    ['no email', { email: '', subOrganizationId: 'sub-jun', emailVerified: true }],
    ['no sub-organization', { email: 'jun@example.com', emailVerified: true }],
    [
      'an unverified email',
      { email: 'jun@example.com', subOrganizationId: 'sub-jun', emailVerified: false },
    ],
    ['no body', null],
  ])('refuses an answer with %s', async (_, body) => {
    fetchMock.mockResolvedValue(response(200, body));
    await expect(findAccountByPasskey('AQID', ASSERTION)).rejects.toThrow();
  });

  it('answers null for a passkey it doesn’t recognise', async () => {
    fetchMock.mockResolvedValue(response(404, { error: 'Passkey not recognised' }));
    await expect(findAccountByPasskey('AQID', ASSERTION)).resolves.toBeNull();
  });

  it('throws for anything else', async () => {
    fetchMock.mockResolvedValue(response(400, { error: 'Challenge expired' }));
    await expect(findAccountByPasskey('AQID', ASSERTION)).rejects.toThrow(
      'Challenge expired',
    );
  });
});
