import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import esLocale from 'i18n-iso-countries/langs/es.json';
import jaLocale from 'i18n-iso-countries/langs/ja.json';

import { type Language, normalizeLanguage } from '../i18n/language';

countries.registerLocale(enLocale);
countries.registerLocale(jaLocale);
countries.registerLocale(esLocale);

const COLLATION: Record<Language, string> = {
  'en': 'en-US',
  'ja': 'ja-JP',
  'es': 'es',
  'zh-Hans': 'zh-Hans-CN',
  'zh-Hant': 'zh-Hant-TW',
};

export const DEFAULT_COUNTRY = 'USA';

// Chinese names come from Intl.DisplayNames, not the library's zh.json: that is
// Simplified only, and Traditional needs Taiwan usage (美國, 南韓).
const countryNames = (lng: Language, locale: string): Record<string, string> => {
  if (!lng.startsWith('zh')) return countries.getNames(lng);
  const display = new Intl.DisplayNames([locale], { type: 'region' });
  return Object.fromEntries(
    Object.keys(countries.getNames('en')).map((alpha2) => [
      alpha2,
      display.of(alpha2) ?? alpha2,
    ]),
  );
};

/**
 * Countries for a select, valued by ISO alpha-3 (what the device-definition
 * API takes) and named in the language on screen, sorted for that language.
 */
export const getCountryOptions = (language: string) => {
  const lng = normalizeLanguage(language) ?? 'en';
  const collator = new Intl.Collator(COLLATION[lng]);
  return Object.entries(countryNames(lng, COLLATION[lng]))
    .flatMap(([alpha2, label]) => {
      const value = countries.alpha2ToAlpha3(alpha2);
      return value ? [{ value, label }] : [];
    })
    .sort((a, b) => collator.compare(a.label, b.label));
};
