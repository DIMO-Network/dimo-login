import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

import { cn } from './cn';

/** A tonal card (console Card.css): the surface separates by tone, not lines. */
export const Card = ({
  as: Tag = 'div',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'li' }) => (
  <Tag
    className={cn('flex flex-col gap-3 rounded-card bg-card p-4', className)}
    {...rest}
  >
    {children}
  </Tag>
);

const NOTICE_ICON = {
  neutral: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  positive: CheckCircleIcon,
};

const NOTICE_ICON_COLOR = {
  neutral: 'text-ink',
  warning: 'text-warning',
  positive: 'text-positive',
};

/** An info or warning box: the icon carries the tone, the words stay fg. */
export const Notice = ({
  tone = 'neutral',
  title,
  children,
  icon,
  className,
  role,
}: {
  tone?: keyof typeof NOTICE_ICON;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  role?: 'status' | 'alert';
}) => {
  const Icon = NOTICE_ICON[tone];
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2.5 rounded-control bg-control p-3 text-[13px] leading-[18px] text-fg',
        className,
      )}
    >
      <span className={cn('mt-px shrink-0', NOTICE_ICON_COLOR[tone])} aria-hidden="true">
        {icon ?? <Icon className="size-[18px]" />}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
};

/** A failed action: what failed, then what it means or the reason. */
export const ErrorBox = ({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div
    role="alert"
    className="flex items-start gap-2.5 rounded-control bg-negative-soft px-3 py-2.5 text-[13px] leading-[18px] text-fg"
  >
    <ExclamationCircleIcon
      className="size-[18px] shrink-0 text-negative"
      aria-hidden="true"
    />
    <span className="flex min-w-0 flex-col [overflow-wrap:anywhere]">
      <b className="font-semibold text-ink">{title}</b>
      {children}
    </span>
  </div>
);

/** The app asking: where the request comes from, from the license-checked redirect URI. */
export const OriginChip = ({ host }: { host: string }) => (
  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-control py-[3px] pl-2 pr-2.5 text-label text-muted">
    <LockClosedIcon className="size-3.5 shrink-0" aria-hidden="true" />
    <span className="truncate">{host}</span>
  </span>
);

/**
 * A screen's title block. The heading takes focus when the screen changes, so
 * screen readers announce the new step (see AppShell).
 */
export const ScreenHeader = ({
  title,
  subtitle,
  host,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  host?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col items-start gap-2">
    <div className="flex flex-col gap-0.5">
      <h1 tabIndex={-1} data-screen-heading className="text-title text-ink outline-none">
        {title}
      </h1>
      {subtitle && <p className="text-body-sm text-muted">{subtitle}</p>}
    </div>
    {host && <OriginChip host={host} />}
    {children}
  </div>
);

/**
 * Sticky footer for a screen's actions, inside the shell's scroll area so it
 * stays in view in the 500×600 popup.
 */
export const ActionBar = ({
  children,
  hint,
  hintId,
  className,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  hintId?: string;
  className?: string;
}) => (
  <div
    className={cn(
      'sticky bottom-0 z-10 -mx-5 mt-auto flex flex-col gap-2 border-t border-outline bg-sheet px-5 pb-4 pt-3',
      className,
    )}
  >
    {hint && (
      <p id={hintId} className="text-label font-normal text-muted">
        {hint}
      </p>
    )}
    <div className="flex flex-row gap-2 [&>*:last-child]:flex-1">{children}</div>
  </div>
);

const DONE_TONE = {
  positive: 'text-positive',
  neutral: 'text-muted',
  negative: 'text-negative',
};

/**
 * The top of a done or result screen: a status tile, the heading (focused
 * when the screen opens, like ScreenHeader) and one line on what it means.
 */
export const DoneHeader = ({
  tone = 'positive',
  icon,
  title,
  children,
}: {
  tone?: keyof typeof DONE_TONE;
  icon?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col items-start gap-2 pt-1">
    <span
      className={cn(
        'mb-1 flex size-12 items-center justify-center rounded-[14px] bg-card',
        DONE_TONE[tone],
      )}
      aria-hidden="true"
    >
      {icon ?? <CheckCircleIcon className="size-[26px]" />}
    </span>
    <h1 tabIndex={-1} data-screen-heading className="text-title text-ink outline-none">
      {title}
    </h1>
    {children && <p className="text-body-sm text-muted">{children}</p>}
  </div>
);

/** A screen: content, then an optional sticky action bar. */
export const Screen = ({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) => (
  <div className="flex min-h-full flex-1 flex-col">
    <div className={cn('flex flex-col gap-4 pb-5', className)}>{children}</div>
    {actions}
  </div>
);
