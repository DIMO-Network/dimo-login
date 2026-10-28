import React from 'react';
import {
  CalendarIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import { Chip } from '../ui';
import { cn } from '../ui/cn';
import { formatDate, formatList } from '../../i18n/format';
import { useT } from '../../i18n';
import { EmailShareRow } from '../Shared/EmailShareRow';
import { AccessItem, inGroup } from './access';

export type ShareEnd = { noEnd: boolean; date: Date };

export const useShareEndLabel = () => {
  const t = useT();
  return (end: ShareEnd) =>
    end.noEnd
      ? t('share_end.no_end')
      : t('share_end.until', { date: formatDate(end.date) });
};

const ItemChips = ({ items }: { items: AccessItem[] }) => {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map(({ id, label, Icon, caution, isNew }) => (
        <li key={id}>
          <Chip
            tone="on-sheet"
            className="font-medium"
            icon={
              <Icon
                aria-hidden="true"
                className={cn(
                  'size-3.5 shrink-0',
                  caution ? 'text-warning' : 'text-muted',
                )}
              />
            }
          >
            {label}
            {caution && <span className="sr-only">, {caution}</span>}
            {isNew && (
              <Chip tone="new" className="ml-0.5 px-1.5 py-0">
                {t('chip.new')}
              </Chip>
            )}
          </Chip>
        </li>
      ))}
    </ul>
  );
};

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="px-0.5 text-label text-muted">{children}</h3>
);

/** The email as part of a request: optional with a switch, or required. */
export interface EmailRequestItem {
  appName: string;
  email: string;
  required: boolean;
  shared: boolean;
  onChange: (shared: boolean) => void;
}

/**
 * The request in one compact card: what the app asks for, about the person
 * (email, driver documents) and about their vehicles, anything new compared
 * with current shares, how long, and a way into the full terms. The screen
 * title already says who is asking. Group labels show only when both groups
 * are there.
 */
export const AccessSummary = ({
  items,
  email,
  end,
  onDetails,
}: {
  items: AccessItem[];
  email?: EmailRequestItem;
  end: ShareEnd;
  onDetails: () => void;
}) => {
  const t = useT();
  const endLabel = useShareEndLabel();
  const added = items.filter((item) => item.isNew).map((item) => item.label);
  const aboutYou = inGroup(items, 'you');
  const vehicles = inGroup(items, 'vehicles');
  const hasYou = aboutYou.length > 0 || !!email;
  const labelled = hasYou && vehicles.length > 0;

  return (
    <section
      aria-label={t('share.access_label')}
      className="flex flex-col gap-2.5 rounded-card bg-card px-3.5 py-3"
    >
      {!!added.length && (
        <p className="flex items-center gap-2 text-[13px] leading-[18px] text-fg">
          <SparklesIcon className="size-4 shrink-0 text-ink" aria-hidden="true" />
          <span>{t('share.also_asks', { list: formatList(added) })}</span>
        </p>
      )}
      {hasYou && (
        <div className="flex flex-col gap-1.5">
          {labelled && <GroupLabel>{t('request.about_you')}</GroupLabel>}
          {aboutYou.length > 0 && <ItemChips items={aboutYou} />}
          {email && (
            <EmailShareRow
              compact
              appName={email.appName}
              email={email.email}
              required={email.required}
              checked={email.shared}
              onChange={email.onChange}
            />
          )}
        </div>
      )}
      {vehicles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {labelled && <GroupLabel>{t('request.about_vehicles')}</GroupLabel>}
          <ItemChips items={vehicles} />
        </div>
      )}
      <div className="flex items-start gap-2 text-body-sm text-fg">
        <CalendarIcon
          className="mt-px size-[18px] shrink-0 text-muted"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 [word-break:auto-phrase]">{endLabel(end)}</span>
        <button
          type="button"
          onClick={onDetails}
          aria-label={t('share.details_label')}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-chip font-semibold text-ink underline-offset-2 hover:underline"
        >
          {t('share.details')}
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};

export default AccessSummary;
