// src/utils/authUtils.ts
export async function generateTargetPublicKey(): Promise<string> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  const publicKey = await window.crypto.subtle.exportKey(
    "raw",
    keyPair.publicKey
  );

  const publicKeyHex = Array.from(new Uint8Array(publicKey))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return publicKeyHex;
}

export function authenticateUser(
  email: string,
  onSuccess: (token: string) => void
) {
  console.log(`Authenticating user with email: ${email}`);

  // Simulate a delay for authentication
  const token = "fake-jwt-token"; // Fake token
  console.log("Authentication successful, token:", token);

  // Send the token to parent window (assuming popup)
  if (window.opener) {
    window.opener.postMessage(
      { token, authType: "popup" },
      "http://localhost:3001" //TODO: PULL URL FROM ENV
    );
    window.close();
  } else if (window.parent) {
    window.parent.postMessage(
      { token, authType: "embed" },
      "http://localhost:3001" //TODO: PULL URL FROM ENV
    );
  }

  // Trigger success callback
  onSuccess(token);
}
