import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/16/solid';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import {
  changeLanguage,
  type Language,
  storeLanguage,
  SUPPORTED_LANGUAGES,
  useLanguage,
  useT,
} from '../../i18n';
import { cn } from '../ui/cn';

// Each language is named in itself, so a reader can find their own.
const NATIVE_NAMES: Record<Language, string> = {
  en: 'English',
  ja: '日本語',
  es: 'Español',
};

/** The in-card language picker. The choice is remembered for this app. */
export const LanguageSwitcher = () => {
  const t = useT();
  const language = useLanguage();
  const { clientId } = useDevCredentials();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (next: Language) => {
    storeLanguage(clientId, next);
    void changeLanguage(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('app.language')}: ${NATIVE_NAMES[language]}`}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium leading-[18px] text-muted transition-colors hover:bg-control hover:text-ink"
      >
        <GlobeAltIcon className="size-4" aria-hidden="true" />
        <span lang={language}>{NATIVE_NAMES[language]}</span>
        <ChevronDownIcon className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t('app.language')}
          className="absolute right-0 top-full z-30 mt-1 flex min-w-[148px] flex-col gap-0.5 rounded-control border border-outline bg-overlay p-1 shadow-float"
        >
          {SUPPORTED_LANGUAGES.map((option) => {
            const selected = option === language;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                lang={option}
                onClick={() => choose(option)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-chip px-2.5 py-2 text-left text-body-sm',
                  selected
                    ? 'bg-selected-bg text-selected-fg'
                    : 'text-fg hover:bg-control',
                )}
              >
                {NATIVE_NAMES[option]}
                {selected && <CheckIcon className="size-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
