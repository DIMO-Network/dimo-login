import en from '../locales/en';
import es from '../locales/es';
import ja from '../locales/ja';
import { formatDate, formatList } from '../format';
import { normalizeLanguage, resolveLanguage, storeLanguage } from '../language';

const PLURAL = /_(zero|one|two|few|many|other)$/;
const baseKeys = (table: Record<string, string>) =>
  Array.from(new Set(Object.keys(table).map((k) => k.replace(PLURAL, '')))).sort();
const placeholders = (text: string) => (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();
const tags = (text: string) => (text.match(/<\/?\w+>/g) ?? []).sort();
// The English form a translated key is checked against: the same key, or
// `_other` for a plural form English doesn't have (`_many`).
const englishFor = (key: string): string =>
  (en as Record<string, string>)[key] ??
  (en as Record<string, string>)[key.replace(PLURAL, '_other')];

const TRANSLATIONS = [
  ['ja', ja],
  ['es', es],
] as const;

describe('locales', () => {
  it.each(TRANSLATIONS)('%s has a string for every English key', (_, table) => {
    expect(baseKeys(table)).toEqual(baseKeys(en));
  });

  it('has the plural forms each language uses', () => {
    for (const [lang, table] of [['en', en], ...TRANSLATIONS] as const) {
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

  it.each(TRANSLATIONS)('%s uses the same {{params}} and tags as English', (_, table) => {
    for (const [key, text] of Object.entries(table)) {
      const english = englishFor(key);
      expect([key, placeholders(text)]).toEqual([key, placeholders(english)]);
      expect([key, tags(text)]).toEqual([key, tags(english)]);
    }
  });

  it('formats dates and lists in Spanish', () => {
    const date = BigInt(Math.floor(Date.UTC(2027, 9, 27) / 1000));
    expect(formatDate(date, 'es')).toBe('27 oct 2027');
    expect(formatList(['eléctricos', 'híbridos'], 'es')).toBe('eléctricos y híbridos');
  });
});

describe('language', () => {
  const setBrowser = (languages: string[], timeZone: string) => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone,
    } as Intl.ResolvedDateTimeFormatOptions);
  };

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reads common spellings of the supported languages', () => {
    expect(normalizeLanguage('ja-JP')).toBe('ja');
    expect(normalizeLanguage('JP')).toBe('ja');
    expect(normalizeLanguage('es-419')).toBe('es');
    expect(normalizeLanguage('ES_mx')).toBe('es');
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

  it('shows Spanish to a browser that lists it, in the browser’s order', () => {
    setBrowser(['es-MX', 'en-US'], 'America/Mexico_City');
    expect(resolveLanguage({})).toBe('es');
    // English first is often just the browser's default.
    setBrowser(['en-US', 'es-US'], 'America/New_York');
    expect(resolveLanguage({})).toBe('es');
    setBrowser(['es-ES', 'ja-JP'], 'Asia/Tokyo');
    expect(resolveLanguage({})).toBe('es');
    setBrowser(['ja-JP', 'es-ES'], 'Europe/Madrid');
    expect(resolveLanguage({})).toBe('ja');
    // No time zone means Spanish: only the browser's languages do.
    setBrowser(['en-US'], 'Europe/Madrid');
    expect(resolveLanguage({})).toBe('en');
  });

  it('lets the app choose, and the user’s own pick win, per app', () => {
    setBrowser(['en-US'], 'Asia/Tokyo');
    expect(resolveLanguage({ configured: 'en' })).toBe('en');
    expect(resolveLanguage({ configured: 'es' })).toBe('es');
    expect(resolveLanguage({ configured: 'fr' })).toBe('ja');

    storeLanguage('0xApp', 'en');
    expect(resolveLanguage({ clientId: '0xapp', configured: 'ja' })).toBe('en');
    expect(resolveLanguage({ clientId: '0xOther', configured: 'ja' })).toBe('ja');
  });
});

describe('test setup', () => {
  it('fails on a key that has no copy instead of rendering the raw key', async () => {
    const { t } = await import('..');
    expect(() => t('no.such.key')).toThrow('Missing translation: no.such.key');
  });
});
