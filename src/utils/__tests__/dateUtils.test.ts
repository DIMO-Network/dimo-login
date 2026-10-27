import { extendByYear, grantEndOf, parseExpirationDate, shareEndOf } from '../dateUtils';

describe('shareEndOf', () => {
  it('names a real end date', () => {
    const seconds = BigInt(Date.parse('2027-01-15T12:00:00Z') / 1000);
    expect(shareEndOf(seconds)).toEqual({
      noEnd: false,
      date: new Date('2027-01-15T12:00:00Z'),
    });
  });

  it('calls the 100-year default what it is, not a date nobody chose', () => {
    expect(shareEndOf(parseExpirationDate(null)).noEnd).toBe(true);
  });
});

describe('grantEndOf', () => {
  it('reads the ISO expiry identity-api returns', () => {
    expect(grantEndOf('2027-01-15T12:00:00Z')).toEqual({
      noEnd: false,
      date: new Date('2027-01-15T12:00:00Z'),
    });
  });

  it('is null when the expiry is missing or unreadable', () => {
    expect(grantEndOf(undefined)).toBeNull();
    expect(grantEndOf('')).toBeNull();
    expect(grantEndOf('not a date')).toBeNull();
  });
});

describe('extendByYear', () => {
  it('works on ISO dates, not display strings', () => {
    expect(extendByYear('2027-01-15T12:00:00.000Z')).toBe('2028-01-15T12:00:00.000Z');
  });
});
