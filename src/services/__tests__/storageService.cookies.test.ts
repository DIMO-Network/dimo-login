// @vitest-environment-options {"url": "https://login.dimo.org/"}
// Off localhost the token cookie is cross-site (SameSite=None; Secure), as when
// the login is embedded in an app's iframe.
import { clearSessionData, storeJWTInCookies } from '../storageService';

const CLIENT = '0xb92d74B468B4047289AEa7c9B953066E39768C16';
const b64 = (value: object) => btoa(JSON.stringify(value));
const JWT = `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 7200 })}.sig`;

/** A cookie write's attributes, leaving out when it expires. */
const attributesOf = (cookie: string) =>
  cookie
    .split('; ')
    .slice(1)
    .filter((attribute) => !/^(expires|max-age)=/i.test(attribute));

it('clears an app’s token cookie with the attributes it was set with', () => {
  const writes: string[] = [];
  vi.spyOn(Document.prototype, 'cookie', 'set').mockImplementation((value: string) => {
    writes.push(value);
  });
  try {
    storeJWTInCookies(CLIENT, JWT);
    clearSessionData(CLIENT);
  } finally {
    vi.restoreAllMocks();
  }

  const [set, cleared] = writes;
  expect(attributesOf(set)).toEqual(['path=/', 'SameSite=None', 'Secure']);
  expect(attributesOf(cleared)).toEqual(attributesOf(set));
  expect(cleared).toMatch(new RegExp(`^auth_token_${CLIENT}=; Max-Age=0`));
});
