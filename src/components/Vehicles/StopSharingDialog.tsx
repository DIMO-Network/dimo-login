import React from 'react';

import { Button, Dialog } from '../ui';
import { useT } from '../../i18n';

/** Stopping is the one action that removes access, so it asks first. */
export const StopSharingDialog = ({
  open,
  appName,
  vehicleName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  appName: string;
  vehicleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const t = useT();
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      role="alertdialog"
      title={t('stop.title')}
      description={t('stop.body', { appName, vehicle: vehicleName })}
    >
      <div className="flex flex-col gap-2">
        <Button variant="destructive" fullWidth onClick={onConfirm}>
          {t('stop.confirm')}
        </Button>
        <Button variant="secondary" fullWidth onClick={onCancel} data-autofocus>
          {t('stop.keep')}
        </Button>
      </div>
    </Dialog>
  );
};

export default StopSharingDialog;
