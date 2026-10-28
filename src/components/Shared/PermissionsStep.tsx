import React, { FC } from 'react';

import { useT, type TranslationKey } from '../../i18n';
import { Chip } from '../ui';

interface PermissionsStepProps {
  devLicenseAlias: string;
}

// What Tesla's own consent screen will ask for next.
const TESLA_PERMISSIONS: { key: TranslationKey; required: boolean }[] = [
  { key: 'tesla.perm.info', required: true },
  { key: 'tesla.perm.location', required: true },
  { key: 'tesla.perm.profile', required: false },
  { key: 'tesla.perm.commands', required: false },
  { key: 'tesla.perm.charging', required: false },
];

export const PermissionsStep: FC<PermissionsStepProps> = ({ devLicenseAlias }) => {
  const t = useT();
  return (
    <>
      <p className="text-body-sm text-fg">
        {t('tesla.needs_access', { appName: devLicenseAlias })}
      </p>
      <ul className="flex flex-col gap-1.5">
        {TESLA_PERMISSIONS.map(({ key, required }) => (
          <li
            key={key}
            className="flex items-center justify-between gap-3 rounded-control bg-card px-3.5 py-3 text-body-sm text-ink"
          >
            <span>{t(key)}</span>
            <Chip tone={required ? 'new' : 'neutral'}>
              {required ? t('tesla.required') : t('tesla.recommended')}
            </Chip>
          </li>
        ))}
      </ul>
    </>
  );
};

export default PermissionsStep;
