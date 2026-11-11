// Function to decode a base64 string (handles URL-safe base64)
const base64Decode = (str: string): string => {
  // Replace URL-safe characters and add padding if necessary
  const paddedStr = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  return atob(paddedStr); // Decode base64
};

// Function to decode a JWT
export const decodeJwt = (jwtToken: string): Record<string, any> | null => {
  try {
    // Split the JWT into its parts
    const parts = jwtToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Decode the payload (2nd part of the JWT)
    const payload = base64Decode(parts[1]);

    // Parse the JSON payload
    return JSON.parse(payload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};
