import { getEmailChoice } from '../services/storageService';

/**
 * Whether the app asks for the user's email (SDK `emailRequest`):
 * - `none`: never ask, never send it.
 * - `optional` (default, and what apps got before the option existed): the
 *   user chooses.
 * - `required`: sharing it is part of continuing. The old `forceEmail=true`
 *   means this.
 */
export type EmailRequest = 'none' | 'optional' | 'required';

const EMAIL_REQUESTS: readonly string[] = ['none', 'optional', 'required'];

export const normalizeEmailRequest = (value: unknown): EmailRequest | undefined => {
  const request = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return EMAIL_REQUESTS.includes(request) ? (request as EmailRequest) : undefined;
};

/** An explicit `emailRequest` wins; otherwise `forceEmail` decides. */
export const resolveEmailRequest = (
  emailRequest: EmailRequest | undefined,
  forceEmail: boolean | undefined,
): EmailRequest => emailRequest ?? (forceEmail ? 'required' : 'optional');

/**
 * A plain login asks once per app and account: always until a required email
 * is shared, and for an optional one only until the user has answered.
 */
export const needsEmailConsent = (
  clientId: `0x${string}` | null,
  email: string | null | undefined,
  request: EmailRequest,
): boolean => {
  if (!email || request === 'none') return false;
  const choice = getEmailChoice(clientId, email);
  return request === 'required' ? choice !== true : choice === undefined;
};
