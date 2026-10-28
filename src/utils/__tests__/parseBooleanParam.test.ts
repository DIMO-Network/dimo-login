import { parseBooleanParam } from '../parseBooleanParam';

describe('parseBooleanParam', () => {
  it('reads explicit true values', () => {
    expect(parseBooleanParam(true)).toBe(true);
    expect(parseBooleanParam('true')).toBe(true);
    expect(parseBooleanParam('1')).toBe(true);
  });

  it('reads everything else as false, including the string "false"', () => {
    for (const value of [false, 'false', '0', '', undefined, null, 'yes'])
      expect(parseBooleanParam(value)).toBe(false);
  });
});
