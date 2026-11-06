import { renderHook } from '@testing-library/react';
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
    vi.doUnmock('../locales/ja');
    vi.resetModules();
  });

  // A fresh copy of the module, with Japanese loading until finishJa() is called.
  const withSlowJapanese = async () => {
    let finishJa!: () => void;
    const jaLoaded = new Promise<void>((resolve) => {
      finishJa = resolve;
    });
    vi.doMock('../locales/ja', async () => {
      await jaLoaded;
      return { default: ja };
    });
    vi.resetModules();
    const fresh = await import('../index');
    const freshInstance = (await import('../instance')).i18n;
    return { fresh, freshInstance, finishJa };
  };

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

  it('applies only the latest choice when an earlier one finishes loading later', async () => {
    const { fresh, freshInstance, finishJa } = await withSlowJapanese();

    const slowJapanese = fresh.changeLanguage('ja');
    await fresh.changeLanguage('en');
    finishJa();
    await slowJapanese;

    expect(freshInstance.language).toBe('en');
  });

  it('keeps the app’s English when the initial language’s download lands late', async () => {
    const { fresh, freshInstance, finishJa } = await withSlowJapanese();
    const { useLanguageSync } = await import('../useLanguageSync');

    // The detected language (say, a Japanese browser) is still downloading
    // when the app's settings arrive and say English.
    const initial = fresh.changeLanguage('ja');
    renderHook(() => useLanguageSync('0xabc', 'en'));
    finishJa();
    await initial;

    expect(freshInstance.language).toBe('en');
  });

  it('counts down the wait for a download that is already running', async () => {
    const { fresh, finishJa } = await withSlowJapanese();
    vi.useFakeTimers();
    try {
      expect(fresh.languageWaitLeft('ja')).toBe(3000);
      const switching = fresh.changeLanguage('ja');

      await vi.advanceTimersByTimeAsync(2000);
      expect(fresh.languageWaitLeft('ja')).toBe(1000);
      await vi.advanceTimersByTimeAsync(5000);
      expect(fresh.languageWaitLeft('ja')).toBe(0);

      finishJa();
      await switching;
      expect(fresh.languageWaitLeft('ja')).toBe(3000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops waiting for a language after the time limit, and switches when it loads', async () => {
    const { fresh, freshInstance, finishJa } = await withSlowJapanese();
    vi.useFakeTimers();
    try {
      let ready = false;
      void fresh.whenLanguageReady('ja', 3000).then(() => {
        ready = true;
      });

      await vi.advanceTimersByTimeAsync(2999);
      expect(ready).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(ready).toBe(true);
      expect(freshInstance.language).toBe('en');
    } finally {
      vi.useRealTimers();
    }

    finishJa();
    await vi.waitFor(() => expect(freshInstance.language).toBe('ja'));
  });
});
