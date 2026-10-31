import React, { useId } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

import { Chip, Switch } from '../ui';
import { cn } from '../ui/cn';
import { useT } from '../../i18n';
import type { useEmailRequest } from '../../hooks/useEmailRequest';

/**
 * The email as an item of the app's request. Optional: a switch, starting
 * from the user's last answer. Required: listed with "Required"; continuing
 * shares it.
 */
export const EmailShareRow = ({
  appName,
  email,
  required = false,
  checked,
  onChange,
  compact = false,
}: {
  appName: string;
  email: string;
  required?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Inside a request card, without a surface of its own. */
  compact?: boolean;
}) => {
  const t = useT();
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        compact
          ? 'rounded-control bg-sheet px-3 py-2.5'
          : 'rounded-card bg-card px-3.5 py-3',
      )}
    >
      <EnvelopeIcon
        className="mt-px size-[18px] shrink-0 self-start text-muted"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          id={labelId}
          className="flex flex-wrap items-center gap-1.5 text-body-sm font-medium text-ink"
        >
          {required ? t('email.item') : t('email.share_title', { appName })}
          {required && <Chip>{t('email.required')}</Chip>}
        </span>
        <span
          id={descriptionId}
          className="text-label font-normal text-muted wrap-anywhere"
        >
          {email}
        </span>
      </div>
      {!required && (
        <Switch
          checked={checked}
          onChange={onChange}
          labelledBy={labelId}
          describedBy={descriptionId}
        />
      )}
    </div>
  );
};

export default EmailShareRow;

/** A plain login's request: the email alone, under "About you". */
export const AboutYouEmail = ({
  appName,
  request,
}: {
  appName: string;
  request: ReturnType<typeof useEmailRequest>;
}) => {
  const t = useT();
  if (!request.asked || !request.email) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-0.5 text-label text-muted">{t('request.about_you')}</h2>
      <EmailShareRow
        appName={appName}
        email={request.email}
        required={request.required}
        checked={request.shared}
        onChange={request.setShared}
      />
    </section>
  );
};
