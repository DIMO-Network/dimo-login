import React from 'react';
import { SignalIcon } from '@heroicons/react/24/outline';

import { buttonClassName } from '../ui';
import { useT } from '../../i18n';
import { APK_URL, IOS_URL } from '../../utils/constants';

/** No vehicles on the account yet: where to connect one. */
export const EmptyState = ({ children }: { children?: React.ReactNode }) => {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col items-center gap-1.5 rounded-card bg-card px-5 py-6 text-center">
        <span className="mb-1.5 flex size-11 items-center justify-center rounded-[12px] bg-highest text-ink">
          <SignalIcon className="size-[22px]" aria-hidden="true" />
        </span>
        <h2 className="text-card-title text-ink">{t('share.empty.title')}</h2>
        <p className="mb-2 max-w-[320px] text-body-sm text-muted">
          {t('share.empty.body')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={IOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName('secondary', 'sm')}
          >
            {t('store.app_store')}
          </a>
          <a
            href={APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName('secondary', 'sm')}
          >
            {t('store.google_play')}
          </a>
        </div>
      </div>
      {children}
    </div>
  );
};

export default EmptyState;
