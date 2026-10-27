import React from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';

import { useT } from '../../i18n';
import { DoneHeader, Screen } from '../ui';

/** After Reject or Cancel in embed mode; the app has been told. */
export const CancelledTransaction: React.FC = () => {
  const t = useT();
  return (
    <Screen>
      <DoneHeader
        tone="neutral"
        icon={<XCircleIcon className="size-[26px]" />}
        title={t('cancelled.title')}
      >
        {t('cancelled.body')}
      </DoneHeader>
    </Screen>
  );
};

export default CancelledTransaction;
