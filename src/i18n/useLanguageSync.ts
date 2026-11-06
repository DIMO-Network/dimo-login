import { useEffect, useState } from 'react';
import { i18n } from './instance';

import { changeLanguage, LANGUAGE_WAIT_MS } from './index';
import { resolveLanguage } from './language';

/**
 * Applies the language once the app's config arrives (popup message, URL,
 * configurationId/configCID) and the clientId is known, since the switcher's
 * remembered choice is kept per app. While the params are still pending it
 * leaves the language alone, so a language named in the URL isn't swapped for
 * the default and back.
 *
 * Returns true while a language it switched to is still loading, for at most
 * LANGUAGE_WAIT_MS, so App can hold the first screen until its copy is there
 * instead of showing the old language and then switching. A switch to a
 * language that's already loaded is never reported.
 */
export const useLanguageSync = (
  clientId: string | null | undefined,
  configured: unknown,
  paramsPending = false,
): boolean => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (paramsPending) return undefined;
    const next = resolveLanguage({ clientId, configured });
    if (i18n.resolvedLanguage === next) return undefined;
    const alreadyLoaded = i18n.hasResourceBundle(next, 'translation');
    const switching = changeLanguage(next);
    if (alreadyLoaded) return undefined;

    let waiting = true;
    const stopWaiting = () => {
      if (waiting) setLoading(false);
      waiting = false;
    };
    setLoading(true);
    const timer = setTimeout(stopWaiting, LANGUAGE_WAIT_MS);
    void switching.finally(() => {
      clearTimeout(timer);
      stopWaiting();
    });
    return () => {
      clearTimeout(timer);
      stopWaiting();
    };
  }, [clientId, configured, paramsPending]);

  return loading;
};
