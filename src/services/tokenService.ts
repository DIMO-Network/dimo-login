function base64UrlDecode(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
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

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeJWT(token);
    const currentTime = Date.now() / 1000; // current time in seconds
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return true; // If decoding fails, assume it's expired
  }
};
