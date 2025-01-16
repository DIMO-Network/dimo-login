// The JWT to decode
// const token = `eyJhbGciOiJSUzI1NiIsImtpZCI6IjU4NjMxZTFjMDJjYzVmMDU5ZTgxZTZkYWMzYWI5MmY1ODRhY2IwODUifQ.eyJpc3MiOiJodHRwczovL2F1dGguZGV2LmRpbW8uem9uZSIsInByb3ZpZGVyX2lkIjoiZ29vZ2xlIiwic3ViIjoiQ2hVeE1USTVPVGcxTlRRNE9UQTNOekV4TWpnNU16RVNCbWR2YjJkc1pRIiwiYXVkIjoibG9naW4td2l0aC1kaW1vIiwiZXhwIjoxNzM4MTAxNDI4LCJpYXQiOjE3MzY4OTE4MjgsImF0X2hhc2giOiIwQnBTVlpiOHV4eHB6V1RwT1BzSDNnIiwiZW1haWwiOiJhaG1lZG1vaXo4NTRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9.ke3iY7wobvaFkwavXXMm5mygfNbf59zst30LNtYkzG7tFPgvrBGCKDchAMLyaFlOR6ionQsUrj1A2lYWw2jRbc4VHKHBlT8rBz6vwjU11cn6dLiKuCzcbf5CA_1qKU3pdXCHKQ3r20ZwrxuY65JVza9_ofbBUNG_LNdgmKQNGmaXDf3jc9npYcUYB8K7NJ2OpwjIrRpz5i8uxgCgAy1HZkmlysCGMxYxEo3Czxl35dYWwU9KWKKjrcLxpcVU0W-cM85cqFRiRehYl3f01E-How5OTnmTjsbqmJ5egDuIyRZcOx4Iaz3T3SBl4Edw9xaYarnDwaqesWCthqXQp8MjZw`;

// Function to decode a base64 string (handles URL-safe base64)
const base64Decode = (str: string): string => {
  // Replace URL-safe characters and add padding if necessary
  const paddedStr = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
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

// Decode the JWT and fetch the email
// const decodedPayload = decodeJwt(token);
// if (decodedPayload) {
//   const email = decodedPayload.email; // Extract email from the payload
//   console.log('Decoded Email:', email);
// } else {
//   console.error('Failed to decode the JWT');
// }

