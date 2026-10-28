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
