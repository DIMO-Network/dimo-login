import { getCountryOptions } from '../countries';

it('values countries by alpha-3 and names them in the language on screen', () => {
  const en = getCountryOptions('en');
  const ja = getCountryOptions('ja');
  const es = getCountryOptions('es');
  expect(en.find((c) => c.value === 'JPN')?.label).toBe('Japan');
  expect(ja.find((c) => c.value === 'JPN')?.label).toBe('日本');
  expect(ja.find((c) => c.value === 'USA')?.label).toBe('アメリカ合衆国');
  expect(es.find((c) => c.value === 'MEX')?.label).toBe('México');
  expect(es.find((c) => c.value === 'USA')?.label).toBe('Estados Unidos');
  // Same set of countries whatever the language.
  expect(ja.map((c) => c.value).sort()).toEqual(en.map((c) => c.value).sort());
  expect(es.map((c) => c.value).sort()).toEqual(en.map((c) => c.value).sort());
});

it('names countries in Chinese with each script’s usage', () => {
  const hant = getCountryOptions('zh-Hant');
  const hans = getCountryOptions('zh-Hans');
  expect(hant.find((c) => c.value === 'USA')?.label).toBe('美國');
  expect(hant.find((c) => c.value === 'KOR')?.label).toBe('南韓');
  expect(hans.find((c) => c.value === 'USA')?.label).toBe('美国');
  expect(hans.find((c) => c.value === 'KOR')?.label).toBe('韩国');
  expect(hant.map((c) => c.value).sort()).toEqual(
    getCountryOptions('en')
      .map((c) => c.value)
      .sort(),
  );
});

it('sorts Chinese names with the script’s collator', () => {
  const labels = getCountryOptions('zh-Hant').map((c) => c.label);
  expect(labels).toEqual([...labels].sort(new Intl.Collator('zh-Hant-TW').compare));
  const simplified = getCountryOptions('zh-Hans').map((c) => c.label);
  expect(simplified).toEqual(
    [...simplified].sort(new Intl.Collator('zh-Hans-CN').compare),
  );
});
