import React from 'react';

import { Button, Dialog } from '../ui';
import { useT } from '../../i18n';

/** Stopping removes an app's access to everything it was given, so it asks first. */
export const RevokeDialog = ({
  appName,
  onConfirm,
  onCancel,
}: {
  /** The app to stop sharing with; null when closed. */
  appName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const t = useT();
  return (
    <Dialog
      open={appName !== null}
      onClose={onCancel}
      role="alertdialog"
      title={t('apps.stop_title', { appName: appName ?? '' })}
      description={t('apps.stop_body', { appName: appName ?? '' })}
    >
      <div className="flex flex-col gap-2">
        <Button variant="destructive" fullWidth onClick={onConfirm}>
          {t('apps.stop')}
        </Button>
        <Button variant="secondary" fullWidth onClick={onCancel} data-autofocus>
          {t('apps.keep')}
        </Button>
      </div>
    </Dialog>
  );
};

export default RevokeDialog;
