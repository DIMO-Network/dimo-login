import React from 'react';

import { cn } from './cn';

export type StatusTone = 'on' | 'ok' | 'pending' | 'off' | 'error' | 'checking';

// Status color marks the dot; the words stay fg (DESIGN.md rule 8).
const DOT: Record<StatusTone, string> = {
  on: 'bg-accent',
  ok: 'bg-positive',
  pending: 'bg-warning',
  off: 'bg-muted',
  error: 'bg-negative',
  checking: 'bg-muted animate-pulse',
};

/** "● Shared until Oct 27, 2027": a status dot and its words. */
export const StatusChip = ({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex w-fit max-w-full items-center gap-1.5 rounded-chip bg-highest px-2 py-0.5 text-label text-fg',
      className,
    )}
  >
    <span className={cn('inline-block size-1.5 shrink-0 rounded-full', DOT[tone])} />
    {/* Wraps when the row is too narrow, so the date is never cut off. */}
    <span className="min-w-0 wrap-anywhere">{children}</span>
  </span>
);

/** A neutral tag: a permission, "New", "Required". */
export const Chip = ({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: 'neutral' | 'new' | 'on-sheet';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex w-fit items-center gap-1.5 rounded-chip px-2 py-0.5 text-label',
      tone === 'neutral' && 'bg-highest text-fg',
      tone === 'new' && 'bg-selected-bg text-selected-fg',
      tone === 'on-sheet' && 'bg-sheet py-1 text-[13px] leading-[18px] text-ink',
      className,
    )}
  >
    {icon}
    {children}
  </span>
);
