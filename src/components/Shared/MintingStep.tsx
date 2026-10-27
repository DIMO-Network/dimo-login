import React, { FC } from 'react';

import { useT } from '../../i18n';

interface MintingStepProps {
  devLicenseAlias: string;
}

export const MintingStep: FC<MintingStepProps> = ({ devLicenseAlias }) => {
  const t = useT();
  return (
    <p className="text-body-sm text-fg">
      {t('tesla.done.body', { appName: devLicenseAlias })}
    </p>
  );
};

export default MintingStep;
