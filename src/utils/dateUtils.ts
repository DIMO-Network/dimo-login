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
 * Converts a BigInt Unix timestamp to a human-readable string in UTC.
 *
 * @param {BigInt} bigIntDate - Unix timestamp as BigInt.
 * @returns {string} - Formatted date string.
 */
export function formatBigIntAsReadableDate(bigIntDate: BigInt): string {
  const unixTimestamp = Number(bigIntDate); // BigInt -> Number
  const date = new Date(unixTimestamp * 1000); // Convert seconds to ms

  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  });

  return formatter.format(date);
}

/**
 * Gets the default expiration date as a BigInt (one year from today).
 *
 * @returns {BigInt} - Default expiration date.
 */
export function getDefaultExpirationDate(): BigInt {
  return parseExpirationDate(null);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

export function extendByYear(dateString: string, years = 1): string {
  // Parse the string into a Date object

  const date = new Date(dateString);

  // Add 1 year
  date.setFullYear(date.getFullYear() + years);

  // Format the updated date back to a string
  const updatedDateString = date.toLocaleDateString('en-US'); // Format as MM/DD/YYYY

  return updatedDateString;
}

// Grants this far out are the "no expiry" default (100 years), not a date
// anyone chose; show them as such.
const NO_END_YEARS = 50;

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
