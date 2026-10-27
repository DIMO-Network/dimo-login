import React, { useId } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

import { Chip, Switch } from '../ui';
import { cn } from '../ui/cn';
import { useT } from '../../i18n';

/**
 * "Share my email with {app}" as a switch row. `required` marks it when the
 * app needs the email (forceEmail); the screen's primary action explains
 * itself with `hintId` until it's on.
 */
export const EmailShareRow = ({
  appName,
  checked,
  onChange,
  required = false,
  description,
  showIcon = false,
  className,
}: {
  appName: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  /** Defaults to what the app may use it for; screens after sign-in show the address. */
  description?: string;
  showIcon?: boolean;
  className?: string;
}) => {
  const t = useT();
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card bg-card px-3.5 py-3',
        className,
      )}
    >
      {showIcon && (
        <EnvelopeIcon
          className="size-[18px] shrink-0 self-start text-muted mt-px"
          aria-hidden="true"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          id={labelId}
          className="flex flex-wrap items-center gap-1.5 text-body-sm font-medium text-ink"
        >
          {t('email.share_title', { appName })}
          {required && <Chip>{t('email.required')}</Chip>}
        </span>
        <span
          id={descriptionId}
          className="text-label font-normal text-muted [overflow-wrap:anywhere]"
        >
          {description ?? t('email.share_desc', { appName })}
        </span>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        labelledBy={labelId}
        describedBy={descriptionId}
      />
    </div>
  );
};

export default EmailShareRow;
