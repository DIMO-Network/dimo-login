import React, { useCallback } from 'react';
import { i18n } from './instance';
import { initReactI18next, Trans as I18nTrans, useTranslation } from 'react-i18next';

import en from './locales/en';
import es from './locales/es';
import ja from './locales/ja';
import {
  DEFAULT_LANGUAGE,
  Language,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
} from './language';
import type { Message, Text, TranslationKey, TranslationParams } from './types';

export type { Message, Text, TranslationKey, TranslationParams } from './types';
export * from './language';

// The URL can name the language in redirect mode; reading it here avoids
// painting English first. The SDK's popup message and stored configurations
// arrive later and switch it through useLanguageSync.
const initialLanguage = (): Language => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const configured = new URLSearchParams(window.location.search).get('language');
  return resolveLanguage({ configured });
};

const setDocumentLanguage = (language: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = language;
};

i18n.on('languageChanged', setDocumentLanguage);

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    es: { translation: es },
  },
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  // Keys are flat strings with dots in them, as in DIMO Driver.
  keySeparator: false,
  nsSeparator: false,
  // React escapes rendered text already.
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
  initAsync: false,
  // No console promo in users' browsers.
  showSupportNotice: false,
});

setDocumentLanguage(i18n.language);

type TFunction = (key: TranslationKey, params?: TranslationParams) => string;

// i18next's own key typing needs TypeScript 5; this keeps the repo's typed
// keys without it.
const translate = (key: string, params?: TranslationParams, lng?: string): string =>
  i18n.t(key, { ...params, ...(lng && { lng }) });

/** Translates outside React (services, validations). Prefer useT in components. */
export const t: TFunction = (key, params) => translate(key, params);

/** A translator pinned to one language, e.g. to show the English contract. */
export const fixedT =
  (lng: Language): TFunction =>
  (key, params) =>
    translate(key, params, lng);

export const message = (key: TranslationKey, params?: TranslationParams): Message => ({
  key,
  params,
});

export const translateText = (
  text: Text | null | undefined,
  tFn: TFunction = t,
): string => {
  if (text === null || text === undefined) return '';
  return typeof text === 'string' ? text : tFn(text.key, text.params);
};

/** The translator for components; re-renders when the language changes. */
export const useT = (): TFunction => {
  const { t: reactT } = useTranslation();
  return useCallback(
    (key, params) =>
      (reactT as unknown as (k: string, o?: object) => string)(key, params),
    [reactT],
  );
};

export const useLanguage = (): Language => {
  // Subscribes to language changes; the value is read from the typed instance.
  useTranslation();
  return (i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LANGUAGE) as Language;
};

/** Renders copy with tags such as `<terms>…</terms>` filled by `components`. */
export const Trans = ({
  k,
  values,
  components,
}: {
  k: TranslationKey;
  values?: TranslationParams;
  components?: Record<string, React.ReactElement>;
}) => {
  const AnyTrans = I18nTrans as unknown as React.FC<Record<string, unknown>>;
  return <AnyTrans i18nKey={k} values={values} components={components} />;
};

export const changeLanguage = (language: Language) => i18n.changeLanguage(language);

export default i18n;
