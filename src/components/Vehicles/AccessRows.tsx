import React from 'react';

import { Chip } from '../ui';
import { cn } from '../ui/cn';
import { useT } from '../../i18n';
import { AccessItem } from './access';

/** Access as a list with descriptions: the terms sheet and the manage screen. */
export const AccessRows = ({
  items,
  tileClassName = 'bg-sheet',
}: {
  items: AccessItem[];
  /** The icon tile's surface: one step off whatever the list sits on. */
  tileClassName?: string;
}) => {
  const t = useT();
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ id, label, description, Icon, caution, isNew }) => (
        <li key={id} className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-control',
              caution ? 'text-warning' : 'text-ink',
              tileClassName,
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-1.5 text-body-sm font-medium text-ink">
              {label}
              {isNew && <Chip tone="new">{t('chip.new')}</Chip>}
            </span>
            {caution && <span className="text-label text-fg">{caution}</span>}
            {description && (
              <span className="text-label font-normal text-muted">{description}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default AccessRows;
