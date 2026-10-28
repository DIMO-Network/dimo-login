import { message, type Message } from '../i18n';

export function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/** Whether an address can be signed in with. Sharing it is asked later. */
export const validateEmail = (email: string): Message | undefined => {
  if (!email || !isValidEmail(email)) {
    return message('email.invalid');
  }
};

/**
 * Email as typed, made comparable: Japanese IMEs can produce full-width
 * letters and ＠, which NFKC turns into the ASCII the address really uses.
 */
export const normalizeEmail = (email: string) => email.normalize('NFKC').trim();
