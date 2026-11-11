import { isValidEmail, normalizeEmail } from './emailUtils';

/**
 * What the app asks of the login (SDK `prompt`):
 * - `select_account`: show the account chooser even if one account is signed in.
 * - `login`: ask for a fresh sign-in.
 */
export type LoginPrompt = 'select_account' | 'login';

const LOGIN_PROMPTS: readonly string[] = ['select_account', 'login'];

/** Longest email address allowed (RFC 5321). */
const MAX_EMAIL_LENGTH = 254;

export const normalizeLoginPrompt = (value: unknown): LoginPrompt | undefined => {
  const prompt = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return LOGIN_PROMPTS.includes(prompt) ? (prompt as LoginPrompt) : undefined;
};

/** SDK `loginHint`: an email to pre-fill. Anything else is dropped. */
export const normalizeLoginHint = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const email = normalizeEmail(value).toLowerCase();
  return email.length <= MAX_EMAIL_LENGTH && isValidEmail(email)
    ? email
    : undefined;
};
