import React, { useEffect, useRef } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { useT } from '../../i18n';
import { readableTextOn } from '../../utils/colorContrast';
import { Logo } from '../Shared/Logo';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * The popup's frame: a sheet on the canvas, full-bleed in the 500px popup and
 * on phones, a floating panel on wider screens. The top bar holds Back, the
 * app's (or DIMO's) logo and the language switcher; screens scroll below it
 * and pin their actions with ActionBar.
 */
export const AppShell = ({
  children,
  loading = false,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) => {
  const t = useT();
  const { oemBrand } = useDevCredentials();
  const { uiState, prevUiStates, goBack, busy } = useUIManager();
  const mainRef = useRef<HTMLElement>(null);

  // A new step starts at the top. Its heading takes focus once the screen has
  // loaded (FocusScreenHeading, rendered by App).
  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [uiState]);

  // The OEM's color, as CSS variables the primary button and focus states read.
  const brandColor = oemBrand?.primaryColor ?? null;
  const brandStyle = brandColor
    ? ({
        ['--popup-brand-color' as string]: brandColor,
        ['--popup-brand-text' as string]: readableTextOn(brandColor),
      } as React.CSSProperties)
    : undefined;

  // While loading, show the OEM's logo only once it's known, so an OEM popup
  // never flashes the DIMO mark first.
  const showLogo = !loading || Boolean(oemBrand?.logoUrl);

  return (
    <div
      className="flex min-h-dvh w-full justify-center bg-canvas md:items-center md:p-6"
      style={brandStyle}
    >
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-sheet md:h-auto md:max-h-[min(760px,calc(100dvh-3rem))] md:min-h-[600px] md:max-w-[520px] md:rounded-panel md:shadow-float">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-1 pl-1">
            {!loading && !busy && prevUiStates.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.back')}
                onClick={goBack}
              >
                <ChevronLeftIcon className="size-5" aria-hidden="true" />
              </Button>
            )}
            {showLogo && <Logo />}
          </div>
          <LanguageSwitcher />
        </header>
        <main ref={mainRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
