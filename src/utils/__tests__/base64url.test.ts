import { base64UrlToBytes, bytesToBase64Url } from '../base64url';

describe('base64url', () => {
  it('decodes unpadded base64url, the - and _ alphabet included', () => {
    expect([...base64UrlToBytes('-_8')]).toEqual([0xfb, 0xff]);
    expect([...base64UrlToBytes('AQID')]).toEqual([1, 2, 3]);
  });

  it('encodes bytes without padding', () => {
    expect(bytesToBase64Url(new Uint8Array([0xfb, 0xff]))).toBe('-_8');
    expect(bytesToBase64Url(new Uint8Array([1, 2, 3, 4]).buffer)).toBe('AQIDBA');
  });

  it('round-trips every byte value', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect([...base64UrlToBytes(bytesToBase64Url(bytes))]).toEqual([...bytes]);
  });

  it('refuses what isn’t base64url', () => {
    expect(() => base64UrlToBytes('a+b/')).toThrow();
    expect(() => base64UrlToBytes('abc=')).toThrow();
  });
});
