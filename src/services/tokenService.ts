function base64UrlDecode(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const decodedData = atob(base64);
  return decodedData;
}

interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
  [key: string]: any; // Allow extra properties
}

// Function to decode JWT
function decodeJWT(token: string): JWTPayload {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Decode the payload (second part of the JWT)
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload) as JWTPayload;
  } catch (e) {
    throw new Error('Error decoding JWT: ' + e);
  }
}

/** The token's lifetime (exp − iat) in seconds; undefined when it lacks either or can't be read. */
export const tokenLifetimeSeconds = (token: string): number | undefined => {
  try {
    const { iat, exp } = decodeJWT(token);
    if (typeof iat !== 'number' || typeof exp !== 'number' || exp <= iat)
      return undefined;
    return exp - iat;
  } catch {
    return undefined;
  }
};

export const isTokenExpired = (token: string, minRemainingSeconds = 0): boolean => {
  try {
    const decoded = decodeJWT(token);
    if (typeof decoded.exp !== 'number') return true; // No usable expiry: treat as expired
    const currentTime = Date.now() / 1000; // current time in seconds
    return decoded.exp < currentTime + minRemainingSeconds;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return true; // If decoding fails, assume it's expired
  }
};
