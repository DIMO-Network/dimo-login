/**
 * authService.ts
 * 
 * This service handles all authentication-related API requests. Primarily through the dimo Auth API
 * 
 * Functions:
 * - Generating Challenges
 * - Verifying Challenges
 * 
 * Usage:
 * This service should be imported and called from components or hooks that handle authentication logic.
 */

const DIMO_AUTH_BASE_URL = process.env.REACT_APP_DIMO_AUTH_URL || 'https://auth.dev.dimo.zone';

// Add an empty export to make it a module
export {};