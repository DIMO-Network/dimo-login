import React from 'react';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

import { useT } from '../../i18n';

/** On done screens: where sharing can be changed later. */
export const ManageInAppNote = () => {
  const t = useT();
  return (
    <p className="flex items-start gap-2.5 rounded-control bg-card p-3 text-[13px] leading-[18px] text-fg">
      <DevicePhoneMobileIcon
        className="size-[18px] shrink-0 text-muted"
        aria-hidden="true"
      />
      <span>{t('done.next')}</span>
    </p>
  );
};

export default ManageInAppNote;
