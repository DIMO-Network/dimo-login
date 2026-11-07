import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '../instance';
import { useLanguageSync } from '../useLanguageSync';

const changeLanguage = vi.hoisted(() => vi.fn());
const languageWaitLeft = vi.hoisted(() => vi.fn());
vi.mock('../index', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../index')>()),
  changeLanguage,
  languageWaitLeft,
}));

describe('useLanguageSync', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    changeLanguage.mockClear();
    changeLanguage.mockResolvedValue(undefined);
    languageWaitLeft.mockReturnValue(3000);
  });

  it('switches even to the language already showing, so a slower switch can’t land after it', () => {
    renderHook(() => useLanguageSync('0xabc', 'en'));

    expect(changeLanguage).toHaveBeenCalledWith('en');
  });

  it('waits only the time left on a download that is already running', () => {
    vi.useFakeTimers();
    languageWaitLeft.mockReturnValue(1000);
    changeLanguage.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useLanguageSync('0xabc', 'ja'));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(999));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it('doesn’t hold the screen once the wait is used up', () => {
    languageWaitLeft.mockReturnValue(0);
    changeLanguage.mockReturnValue(new Promise(() => {}));
    const reported: boolean[] = [];

    renderHook(() => {
      const loading = useLanguageSync('0xabc', 'ja');
      reported.push(loading);
      return loading;
    });

    expect(changeLanguage).toHaveBeenCalledWith('ja');
    expect(reported).not.toContain(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not switch while the params are pending', () => {
    renderHook(() => useLanguageSync(null, 'ja', true));

    expect(changeLanguage).not.toHaveBeenCalled();
  });

  it('switches once the params are known', () => {
    const { rerender } = renderHook(
      ({ pending }) => useLanguageSync('0xabc', 'ja', pending),
      { initialProps: { pending: true } },
    );
    expect(changeLanguage).not.toHaveBeenCalled();

    rerender({ pending: false });

    expect(changeLanguage).toHaveBeenCalledWith('ja');
  });

  it('reports a language that is still loading until the switch settles', async () => {
    let settle!: () => void;
    changeLanguage.mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );

    const { result } = renderHook(() => useLanguageSync('0xabc', 'ja'));
    expect(result.current).toBe(true);

    await act(async () => settle());
    expect(result.current).toBe(false);
  });

  it('never reports a switch to a language that is already loaded', () => {
    i18n.addResourceBundle('ja', 'translation', {});
    try {
      const reported: boolean[] = [];
      renderHook(() => {
        const loading = useLanguageSync('0xabc', 'ja');
        reported.push(loading);
        return loading;
      });

      expect(changeLanguage).toHaveBeenCalledWith('ja');
      expect(reported).not.toContain(true);
    } finally {
      i18n.removeResourceBundle('ja', 'translation');
    }
  });

  it('stops reporting a load after 3 s', () => {
    vi.useFakeTimers();
    changeLanguage.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useLanguageSync('0xabc', 'ja'));
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(2999));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });
});
