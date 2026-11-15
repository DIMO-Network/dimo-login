import { normalizeLoginHint, normalizeLoginPrompt } from '../loginPrompt';

describe('normalizeLoginPrompt', () => {
  it.each([
    ['select_account', 'select_account'],
    [' LOGIN ', 'login'],
    ['none', undefined],
    [true, undefined],
    [undefined, undefined],
    ['Select_Account', 'select_account'],
    ['', undefined],
    ['log\nin', undefined],
  ])('prompt %j → %j', (value, expected) => {
    expect(normalizeLoginPrompt(value)).toBe(expected);
  });
});

describe('normalizeLoginHint', () => {
  it.each([
    [' Alice@X.co ', 'alice@x.co'],
    ['ａｌｉｃｅ＠ｘ．ｃｏ', 'alice@x.co'],
    ['not an email', undefined],
    [`${'a'.repeat(250)}@x.co`, undefined],
    [['a@x.co'], undefined],
    ['', undefined],
    [`${'a'.repeat(254 - 5)}@x.co`, `${'a'.repeat(254 - 5)}@x.co`],
  ])('loginHint %j → %j', (value, expected) => {
    expect(normalizeLoginHint(value)).toBe(expected);
  });
});
