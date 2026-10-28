/**
 * Which language the login shows, first match wins:
 *   1. the user's pick in the language switcher (remembered per app),
 *   2. the `language` the app configured (SDK option, URL param, configuration),
 *   3. the first of the browser's languages the login has, other than English
 *      (English is often only the browser's default, so it isn't a choice),
 *   4. a Japan time zone, for people in Japan with a non-Japanese browser,
 *   5. English.
 * Detection uses only the browser, never the network.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ja', 'es'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

/** Accepts BCP 47 tags and a few common spellings: `ja`, `ja-JP`, `jp`, `es-MX`, `en-US`. */
export const normalizeLanguage = (value: unknown): Language | undefined => {
  if (typeof value !== 'string') return undefined;
  const tag = value.trim().toLowerCase().replace('_', '-');
  if (tag === 'jp' || tag === 'ja' || tag.startsWith('ja-')) return 'ja';
  if (tag === 'es' || tag.startsWith('es-')) return 'es';
  if (tag === 'en' || tag.startsWith('en-')) return 'en';
  return undefined;
};

const storageKey = (clientId: string) => `dimo_login_language_${clientId.toLowerCase()}`;

export const getStoredLanguage = (clientId?: string | null): Language | undefined => {
  if (!clientId) return undefined;
  try {
    return normalizeLanguage(localStorage.getItem(storageKey(clientId)));
  } catch {
    return undefined;
  }
};

export const storeLanguage = (
  clientId: string | null | undefined,
  language: Language,
) => {
  if (!clientId) return;
  try {
    localStorage.setItem(storageKey(clientId), language);
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
};

const browserLanguages = (): readonly string[] => {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
};

const JAPAN_TIME_ZONES = ['Asia/Tokyo'];

const browserTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

export const detectLanguage = (): Language | undefined => {
  const browserChoice = browserLanguages()
    .map(normalizeLanguage)
    .find((language) => language && language !== DEFAULT_LANGUAGE);
  if (browserChoice) return browserChoice;
  const timeZone = browserTimeZone();
  if (timeZone && JAPAN_TIME_ZONES.includes(timeZone)) return 'ja';
  return undefined;
};

export const resolveLanguage = ({
  clientId,
  configured,
}: {
  clientId?: string | null;
  configured?: unknown;
}): Language =>
  getStoredLanguage(clientId) ??
  normalizeLanguage(configured) ??
  detectLanguage() ??
  DEFAULT_LANGUAGE;
