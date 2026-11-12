/**
 * base64url (RFC 4648 §5, unpadded), as WebAuthn credential IDs and challenges
 * travel. Native atob/btoa only: the first screen may import this, and must
 * not load `buffer` or the wallet stack.
 */

const BASE64URL = /^[A-Za-z0-9_-]*$/;

/** The bytes of a base64url string; throws on anything that isn't one. */
export const base64UrlToBytes = (value: string): Uint8Array<ArrayBuffer> => {
  if (!BASE64URL.test(value) || value.length % 4 === 1) {
    throw new Error('Not base64url');
  }
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

/** Bytes as unpadded base64url. */
export const bytesToBase64Url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  view.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
