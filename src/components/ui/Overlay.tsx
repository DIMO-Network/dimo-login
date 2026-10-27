import React, { useEffect, useId, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { cn } from './cn';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog (centered) or sheet (from the bottom), from the console's
 * ui/dialog.tsx on plain elements: focus moves in and is kept inside, Esc and
 * the scrim close it, and focus returns to what opened it.
 */
export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  variant = 'dialog',
  role = 'dialog',
  closeLabel,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  variant?: 'dialog' | 'sheet';
  /** alertdialog for a confirmation that needs an answer. */
  role?: 'dialog' | 'alertdialog';
  /** Accessible name of the close button; omit to show none. */
  closeLabel?: string;
  /** False while busy, so a half-finished action can't be dismissed. */
  dismissible?: boolean;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // [data-autofocus] picks the safe choice in a confirmation.
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!focusable.length) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      opener?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-scrim backdrop-blur-[6px]"
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col gap-3 bg-overlay text-fg shadow-float',
          variant === 'dialog' &&
            'left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel p-5',
          variant === 'sheet' &&
            'inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-[520px] rounded-t-panel pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-3',
            variant === 'sheet' && 'px-5 pt-4',
          )}
        >
          <h2 id={titleId} className="text-panel-title text-ink">
            {title}
          </h2>
          {closeLabel && dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-1 -mt-1 rounded-full p-1 text-muted transition-colors hover:bg-control hover:text-ink"
            >
              <XMarkIcon className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {description && (
          <p
            id={descriptionId}
            className={cn('text-body-sm text-muted', variant === 'sheet' && 'px-5')}
          >
            {description}
          </p>
        )}
        <div
          className={cn(
            'flex min-h-0 flex-col gap-4',
            variant === 'sheet' && 'overflow-y-auto px-5',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
