/**
 * Reads a boolean param from any transport. URL params and stored
 * configurations arrive as strings, where `Boolean('false')` is true, so only
 * an explicit true value counts.
 */
export const parseBooleanParam = (value: unknown): boolean =>
  value === true || value === 'true' || value === '1';
