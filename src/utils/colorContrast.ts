/**
 * Pick a readable text color (#ffffff or #000000) for a given background hex,
 * using WCAG relative luminance. Lets buttons styled with a brand background
 * flip their label between white and black without the OEM having to specify
 * both shades.
 */
export function readableTextOn(hex: string | null | undefined): '#ffffff' | '#000000' {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return '#000000';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luma = 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  // Crossover where contrast with white equals contrast with black: sqrt(1.05 * 0.05) - 0.05
  return luma > 0.179 ? '#000000' : '#ffffff';
}
