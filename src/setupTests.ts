// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Components render real English copy in tests, and a key with no copy fails
// the test instead of rendering the raw key.
import i18n from './i18n';

void i18n.changeLanguage('en');
i18n.options.saveMissing = true;
i18n.on('missingKey', (_lngs, _ns, key) => {
  throw new Error(`Missing translation: ${key}`);
});
