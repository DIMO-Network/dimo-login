import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, t } from '../index';
import { i18n } from '../instance';
import ja from '../locales/ja';

describe('loading languages on demand', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.doUnmock('../locales/es');
    vi.resetModules();
  });

  it('loads Japanese before switching to it', async () => {
    await changeLanguage('ja');

    expect(i18n.hasResourceBundle('ja', 'translation')).toBe(true);
    expect(t('common.try_again')).toBe(ja['common.try_again']);
  });

  it('does not load Spanish until it is chosen', () => {
    expect(i18n.hasResourceBundle('es', 'translation')).toBe(false);
  });

  it('stays in English when a language fails to load', async () => {
    vi.doMock('../locales/es', () => {
      throw new Error('offline');
    });
    vi.resetModules();
    const fresh = await import('../index');
    const freshInstance = (await import('../instance')).i18n;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await fresh.changeLanguage('es');

    expect(freshInstance.language).toBe('en');
    expect(freshInstance.hasResourceBundle('es', 'translation')).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
