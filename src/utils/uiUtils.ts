import { HEADERS } from '../enums';
import { KeyboardEvent } from 'react';

/**
 * Renders the popup's primary title.
 *
 *   - When `brandName` is present (the dev license owner has uploaded a
 *     brand in the console), the title becomes `"Sign in with {brandName}"`
 *     to match the SDK's button label — one unified messaging string.
 *   - When `brandName` is absent, falls back to today's templates:
 *       default → "{alias} uses DIMO to connect to your cars"
 *       altTitle → "Login to {alias} using DIMO"
 */
export const getSignInTitle = (
  alias: string,
  { altTitle = false, brandName }: { altTitle?: boolean; brandName?: string | null } = {},
) => {
  if (brandName) {
    return `Sign in with ${brandName}`;
  }
  const titleBaseText = altTitle ? HEADERS.ALT : HEADERS.DEFAULT;
  return titleBaseText.replace('%s', alias);
};

export const getKeyboardEventListener =
  (keyType: string, callback: () => void) => (e: KeyboardEvent<unknown>) => {
    if (e.key === keyType) {
      callback();
    }
  };
