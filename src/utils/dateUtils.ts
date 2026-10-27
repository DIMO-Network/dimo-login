import { formatDate as formatDisplayDate } from '../i18n/format';

// dateUtils.js

/**
 * Parses an ISO 8601 date string to a BigInt representing the Unix timestamp in seconds.
 * If no date is provided, returns a default expiration date one year from today.
 *
 * @param {string|null} isoDateString - The ISO 8601 date string or null.
 * @returns {BigInt} - Unix timestamp as BigInt.
 */
export function parseExpirationDate(isoDateString: string | null): bigint {
  if (!isoDateString) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 100);

    const unixTimestamp = Math.floor(oneYearFromNow.getTime() / 1000);
    return BigInt(unixTimestamp);
  }
  // Attempt to parse the provided date
  const parsedDate = new Date(isoDateString);

  if (isNaN(parsedDate.getTime())) {
    // Invalid date string; fallback to default expiration
    return parseExpirationDate(null);
  }

  // Convert valid date to Unix timestamp (in seconds) and then BigInt
  const unixTimestamp = Math.floor(parsedDate.getTime() / 1000);
  return BigInt(unixTimestamp);
}

/**
 * Gets the default expiration date as a BigInt (one year from today).
 *
 * @returns {BigInt} - Default expiration date.
 */
export function getDefaultExpirationDate(): BigInt {
  return parseExpirationDate(null);
}

/** A date for display, in the language on screen. Never parse it back. */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  return formatDisplayDate(dateString);
}

/**
 * Moves an ISO date forward by whole years and returns it as ISO. It used to
 * parse and return the en-US display string, which broke as soon as dates were
 * shown in another language.
 */
export function extendByYear(isoDate: string, years = 1): string {
  const date = new Date(isoDate);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString();
}

// Grants this far out are the "no expiry" default (100 years), not a date
// anyone chose; show them as such.
const NO_END_YEARS = 50;

/** When a share ends, for copy keyed `share_end.*`: no end date, or a date. */
export function shareEndOf(expirationSeconds: BigInt): { noEnd: boolean; date: Date } {
  const date = new Date(Number(expirationSeconds.toString()) * 1000);
  const noEnd = new Date();
  noEnd.setFullYear(noEnd.getFullYear() + NO_END_YEARS);
  return { noEnd: date.getTime() >= noEnd.getTime(), date };
}

/** How long a share will last, for consent text: "until Jan 1, 2027". */
export function describeShareEnd(expirationSeconds: BigInt): string {
  const ms = Number(expirationSeconds.toString()) * 1000;
  const noEnd = new Date();
  noEnd.setFullYear(noEnd.getFullYear() + NO_END_YEARS);
  if (ms >= noEnd.getTime()) return 'with no end date';
  return `until ${new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}
