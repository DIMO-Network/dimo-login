import { KeyboardEvent } from 'react';

import { t } from '../i18n';

/**
 * Renders the popup's primary title.
 *
 *   - When `brandName` is present (the dev license owner has uploaded a
 *     brand in the console), the title becomes `"Sign in with {brandName}"`
 *     to match the SDK's button label — one unified messaging string.
 *   - When `brandName` is absent:
 *       default → "Sign in with DIMO" (the screen adds "to continue to {alias}")
 *       altTitle → "Log in to {alias} with DIMO"
 */
export const getSignInTitle = (
  alias: string,
  { altTitle = false, brandName }: { altTitle?: boolean; brandName?: string | null } = {},
) => {
  if (brandName) {
    return t('signin.title_brand', { brandName });
  }
  return t(altTitle ? 'signin.title_alt' : 'signin.title_default', { appName: alias });
};

export const getKeyboardEventListener =
  (keyType: string, callback: () => void) => (e: KeyboardEvent<unknown>) => {
    // Enter that confirms a Japanese (IME) conversion is not a submit.
    const native = e.nativeEvent as unknown as {
      isComposing?: boolean;
      keyCode?: number;
    };
    if (native?.isComposing || native?.keyCode === 229) return;
    if (e.key === keyType) {
      callback();
    }
  };
