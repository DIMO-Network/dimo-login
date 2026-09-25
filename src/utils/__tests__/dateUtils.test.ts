import { describeShareEnd, parseExpirationDate } from '../dateUtils';

describe('describeShareEnd', () => {
  it('names a real end date', () => {
    const seconds = BigInt(Date.parse('2027-01-15T12:00:00Z') / 1000);
    expect(describeShareEnd(seconds)).toBe('until Jan 15, 2027');
  });

  it('calls the 100-year default what it is, not a date nobody chose', () => {
    expect(describeShareEnd(parseExpirationDate(null))).toBe('with no end date');
  });
});
