import { keepLaterExpiration } from '../vehicles';

describe('keepLaterExpiration', () => {
  const seconds = (iso: string) => BigInt(Date.parse(iso) / 1000);

  it("keeps the current grant's expiry when it runs longer", () => {
    const vehicle = { grantExpiresAt: '2028-06-01T00:00:00Z' };
    expect(keepLaterExpiration(vehicle, seconds('2026-12-01T00:00:00Z'))).toBe(
      seconds('2028-06-01T00:00:00Z'),
    );
  });

  it('uses the requested expiry when it is later or the current one is unknown', () => {
    const later = seconds('2030-01-01T00:00:00Z');
    expect(keepLaterExpiration({ grantExpiresAt: '2028-06-01T00:00:00Z' }, later)).toBe(
      later,
    );
    expect(keepLaterExpiration({}, later)).toBe(later);
  });
});
