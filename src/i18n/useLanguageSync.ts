import { useEffect, useState } from 'react';
import { i18n } from './instance';

import { changeLanguage, languageWaitLeft } from './index';
import { resolveLanguage } from './language';

/**
 * Applies the language once the app's config arrives (popup message, URL,
 * configurationId/configCID) and the clientId is known, since the switcher's
 * remembered choice is kept per app. While the params are still pending it
 * leaves the language alone, so a language named in the URL isn't swapped for
 * the default and back.
 *
 * Returns true while a language it switched to is still loading, for at most
 * what's left of LANGUAGE_WAIT_MS (a download that started at boot counts),
 * so App can hold the first screen until its copy is there instead of showing
 * the old language and then switching. A switch to a language that's already
 * loaded is never reported.
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
    // Read before switching: the switch is what starts a download.
    const waitMs = i18n.hasResourceBundle(next, 'translation')
      ? 0
      : languageWaitLeft(next);
    // Switch even to the language already showing: the call supersedes a
    // slower switch still in flight, such as the initial language's download.
    const switching = changeLanguage(next);
    if (waitMs === 0) return undefined;

    let waiting = true;
    const stopWaiting = () => {
      if (waiting) setLoading(false);
      waiting = false;
    };
    setLoading(true);
    const timer = setTimeout(stopWaiting, waitMs);
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
