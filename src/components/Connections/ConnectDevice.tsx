import { type FC } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

import PhysicalAdapter from '../../assets/images/physical-adapter.png';
import { useUIManager } from '../../context/UIManagerContext';
import { getRedirectHost } from '../../utils/urlHelpers';
import { IOS_URL, SHOP_DIMO_URL } from '../../utils/constants';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useT } from '../../i18n';
import { ActionBar, Button, Screen, ScreenHeader } from '../ui';
import { useAppName } from '../../hooks/useAppName';

/** A vehicle that needs a DIMO adapter, which is set up in the mobile app. */
export const ConnectDevice: FC = () => {
  const t = useT();
  const { componentData, goBack } = useUIManager();
  const { redirectUri } = useDevCredentials();
  const appName = useAppName();
  const vehicle = [componentData?.modelYear, componentData?.makeModel]
    .filter(Boolean)
    .join(' ');

  return (
    <Screen
      actions={
        <ActionBar className="[&>div]:flex-col">
          <Button fullWidth onClick={() => window.open(IOS_URL, '_blank')}>
            {t('device.open_app')}
            <ArrowTopRightOnSquareIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => window.open(SHOP_DIMO_URL, '_blank')}
          >
            {t('device.shop')}
            <ArrowTopRightOnSquareIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" fullWidth onClick={goBack}>
            {t('device.later')}
          </Button>
        </ActionBar>
      }
    >
      <ScreenHeader
        title={t('device.title', { vehicle })}
        host={getRedirectHost(redirectUri)}
      />
      <p className="text-body-sm text-fg">{t('device.body', { appName })}</p>
      <div className="flex justify-center rounded-card bg-card p-6">
        <img
          className="size-28 rounded-full object-cover"
          src={PhysicalAdapter}
          alt={t('device.image_alt')}
        />
      </div>
    </Screen>
  );
};
