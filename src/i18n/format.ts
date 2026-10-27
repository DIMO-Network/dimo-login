import { i18n } from './instance';

/**
 * Dates, lists and numbers in the language on screen. Display only: never
 * parse these strings back (dates for logic stay ISO or unix seconds).
 */
const locale = (lng?: string) => {
  const language = lng ?? i18n.resolvedLanguage ?? i18n.language ?? 'en';
  return language === 'ja' ? 'ja-JP' : 'en-US';
};

const toDate = (value: Date | string | number | bigint | BigInt): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  // Unix seconds (bigint or number), as grants and expirations are stored.
  return new Date(Number(value.toString()) * 1000);
};

/** "Oct 27, 2027" / "2027年10月27日". */
export const formatDate = (
  value: Date | string | number | bigint | BigInt,
  lng?: string,
) => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const language = locale(lng);
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: language === 'ja-JP' ? 'long' : 'short',
    day: 'numeric',
  }).format(date);
};

/** Date and time in UTC, as the contract states them: "October 27, 2027 at 1:20 PM UTC". */
export const formatDateTimeUTC = (
  value: Date | string | number | bigint | BigInt,
  lng?: string,
) => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${new Intl.DateTimeFormat(locale(lng), {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)} UTC`;
};

/** "A, B and C" / "A、B、C". */
export const formatList = (items: string[], lng?: string) => {
  const ListFormat = (
    Intl as unknown as {
      ListFormat?: new (...args: unknown[]) => { format(items: string[]): string };
    }
  ).ListFormat;
  if (ListFormat) {
    return new ListFormat(locale(lng), { style: 'long', type: 'conjunction' }).format(
      items,
    );
  }
  return items.join(locale(lng) === 'ja-JP' ? '、' : ', ');
};
