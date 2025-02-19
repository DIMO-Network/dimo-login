import { Buffer } from 'buffer';
export async function generateTargetPublicKey(): Promise<string> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKey = await window.crypto.subtle.exportKey(
    'raw',
    keyPair.publicKey
  );

  const publicKeyHex = Array.from(new Uint8Array(publicKey))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return publicKeyHex;
}

export function generateRandomBuffer(): ArrayBuffer {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr.buffer;
}

export function base64UrlEncode(challenge: ArrayBuffer): string {
  return Buffer.from(challenge)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function bufferToHex(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer);
  return Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function bufferToBase64(buffer: Uint8Array): string {
  // Convert the Uint8Array to a string using Array.from()
  const binaryString = Array.from(buffer)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return btoa(binaryString);
}
