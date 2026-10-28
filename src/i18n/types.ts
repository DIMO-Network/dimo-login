import type en from './locales/en';

type EnglishKey = keyof typeof en;
type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** A key as code uses it: plural keys are named without their suffix. */
export type TranslationKey = EnglishKey extends infer K
  ? K extends `${infer Base}_${PluralSuffix}`
    ? Base
    : K
  : never;

/** Every English key except the `_one` forms, which Japanese doesn't use. */
export type LocaleResources = {
  [K in EnglishKey as K extends `${string}_one` ? never : K]: string;
};

export type TranslationParams = Record<string, string | number | null | undefined>;

/**
 * Copy kept in state (errors, loading messages, validation results) as a key,
 * so it's translated when shown and follows a language switch mid-flow.
 */
export type Message = { key: TranslationKey; params?: TranslationParams };

/** A plain string is shown as it is: server error text, app-supplied copy. */
export type Text = string | Message;
