import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '../instance';
import { useLanguageSync } from '../useLanguageSync';

const changeLanguage = vi.hoisted(() => vi.fn());
vi.mock('../index', () => ({ changeLanguage }));

describe('useLanguageSync', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    changeLanguage.mockClear();
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
});
