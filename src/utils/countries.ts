import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import jaLocale from 'i18n-iso-countries/langs/ja.json';

countries.registerLocale(enLocale);
countries.registerLocale(jaLocale);

export const DEFAULT_COUNTRY = 'USA';

/**
 * Countries for a select, valued by ISO alpha-3 (what the device-definition
 * API takes) and named in the language on screen, sorted for that language.
 */
export const getCountryOptions = (language: string) => {
  const lng = language === 'ja' ? 'ja' : 'en';
  const collator = new Intl.Collator(lng === 'ja' ? 'ja-JP' : 'en-US');
  return Object.entries(countries.getNames(lng))
    .flatMap(([alpha2, label]) => {
      const value = countries.alpha2ToAlpha3(alpha2);
      return value ? [{ value, label }] : [];
    })
    .sort((a, b) => collator.compare(a.label, b.label));
};
