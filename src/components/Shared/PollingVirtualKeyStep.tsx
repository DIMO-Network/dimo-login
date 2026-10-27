import React, { FC } from 'react';

import { useT } from '../../i18n';
import { Dots } from '../ui';

export const PollingVirtualKeyStep: FC = () => {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-4" role="status">
      <p className="text-body-sm text-fg">{t('tesla.waiting.body')}</p>
      <span className="text-muted">
        <Dots />
      </span>
    </div>
  );
};

export default PollingVirtualKeyStep;
