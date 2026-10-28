import en from '../locales/en';
import ja from '../locales/ja';
import { normalizeLanguage, resolveLanguage, storeLanguage } from '../language';

const PLURAL = /_(zero|one|two|few|many|other)$/;
const baseKeys = (table: Record<string, string>) =>
  Array.from(new Set(Object.keys(table).map((k) => k.replace(PLURAL, '')))).sort();
const placeholders = (text: string) => (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();
const tags = (text: string) => (text.match(/<\/?\w+>/g) ?? []).sort();
const firstForm = (table: Record<string, string>, base: string) =>
  table[base] ?? table[`${base}_other`];

describe('locales', () => {
  it('Japanese has a string for every English key', () => {
    expect(baseKeys(ja)).toEqual(baseKeys(en));
  });

  it('has the plural forms each language uses', () => {
    for (const [lang, table] of [
      ['en', en],
      ['ja', ja],
    ] as const) {
      const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
      const plurals = Object.keys(table).filter((k) => PLURAL.test(k));
      for (const key of plurals) {
        const base = key.replace(PLURAL, '');
        for (const category of categories) {
          expect(Object.keys(table)).toContain(`${base}_${category}`);
        }
      }
    }
  });

  it('uses the same {{params}} and tags in both languages', () => {
    for (const base of baseKeys(en)) {
      const english = firstForm(en, base)!;
      const japanese = firstForm(ja, base)!;
      expect([base, placeholders(japanese)]).toEqual([base, placeholders(english)]);
      expect([base, tags(japanese)]).toEqual([base, tags(english)]);
    }
  });
});

describe('language', () => {
  const setBrowser = (languages: string[], timeZone: string) => {
    jest.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
    jest
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({ timeZone } as Intl.ResolvedDateTimeFormatOptions);
  };

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('reads common spellings of the supported languages', () => {
    expect(normalizeLanguage('ja-JP')).toBe('ja');
    expect(normalizeLanguage('JP')).toBe('ja');
    expect(normalizeLanguage('en_US')).toBe('en');
    expect(normalizeLanguage('fr')).toBeUndefined();
    expect(normalizeLanguage(undefined)).toBeUndefined();
  });

  it('shows Japanese to a Japanese browser and to someone in Japan', () => {
    setBrowser(['ja-JP', 'en-US'], 'America/Los_Angeles');
    expect(resolveLanguage({})).toBe('ja');
    setBrowser(['en-US'], 'Asia/Tokyo');
    expect(resolveLanguage({})).toBe('ja');
    setBrowser(['en-US'], 'Europe/London');
    expect(resolveLanguage({})).toBe('en');
  });

  it('lets the app choose, and the user’s own pick win, per app', () => {
    setBrowser(['en-US'], 'Asia/Tokyo');
    expect(resolveLanguage({ configured: 'en' })).toBe('en');
    expect(resolveLanguage({ configured: 'fr' })).toBe('ja');

    storeLanguage('0xApp', 'en');
    expect(resolveLanguage({ clientId: '0xapp', configured: 'ja' })).toBe('en');
    expect(resolveLanguage({ clientId: '0xOther', configured: 'ja' })).toBe('ja');
  });
});

describe('test setup', () => {
  it('fails on a key that has no copy instead of rendering the raw key', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { t } = require('..');
    expect(() => t('no.such.key')).toThrow('Missing translation: no.such.key');
  });
});
