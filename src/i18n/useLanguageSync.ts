import { useEffect } from 'react';
import { i18n } from './instance';

import { changeLanguage } from './index';
import { resolveLanguage } from './language';

/**
 * Applies the language once the app's config arrives (popup message, URL,
 * configurationId/configCID) and the clientId is known, since the switcher's
 * remembered choice is kept per app.
 */
export const useLanguageSync = (
  clientId: string | null | undefined,
  configured: unknown,
) => {
  useEffect(() => {
    const next = resolveLanguage({ clientId, configured });
    if (i18n.resolvedLanguage !== next) void changeLanguage(next);
  }, [clientId, configured]);
};
