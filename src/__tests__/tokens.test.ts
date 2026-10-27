import fs from 'fs';
import path from 'path';

// The console's contrast checks (its __tests__/unit/utils/tokens.test.ts) for
// the light tokens the login uses. Add a pair here before adding a color.
const css = fs.readFileSync(path.join(__dirname, '../index.css'), 'utf8');

const rootBlock = () => {
  const start = css.search(/:root\s*\{/);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
};

const light = Object.fromEntries(
  Array.from(rootBlock().matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)).map((m) => [
    m[1],
    [Number(m[2]), Number(m[3]), Number(m[4])],
  ]),
) as Record<string, number[]>;

const luminance = ([r, g, b]: number[]) => {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('light design tokens', () => {
  it.each([
    ['fg', 'sheet'],
    ['fg', 'card'],
    ['fg', 'control'],
    ['ink', 'canvas'],
    ['muted', 'sheet'],
    ['muted', 'card'],
    ['muted', 'control'],
    ['negative', 'sheet'],
    ['fg', 'negative-soft'],
    ['btn-primary-fg', 'btn-primary'],
    ['selected-fg', 'selected-bg'],
  ])('%s text on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrast(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['control-border', 'sheet'],
    ['control-border', 'control'],
    ['focus-ring', 'sheet'],
    ['accent', 'sheet'],
    ['warning', 'card'],
    ['positive', 'card'],
  ])('%s on %s is visible (3:1)', (mark, bg) => {
    expect(contrast(light[mark], light[bg])).toBeGreaterThanOrEqual(3);
  });
});
