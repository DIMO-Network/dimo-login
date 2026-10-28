import React, { FC } from 'react';

import { TeslaVehicle } from '../../types';
import { Trans, useT } from '../../i18n';
import { VehicleTile } from '../Vehicles/VehicleRow';

interface VirtualKeyStepProps {
  devLicenseAlias: string;
  vehicleToAdd?: TeslaVehicle;
}

export const VirtualKeyStep: FC<VirtualKeyStepProps> = ({
  devLicenseAlias,
  vehicleToAdd,
}) => {
  const t = useT();
  return (
    <>
      <p className="text-body-sm text-fg">
        {t('tesla.needs_access', { appName: devLicenseAlias })}
      </p>
      <p className="text-body-sm text-fg">{t('tesla.key.body')}</p>
      <p className="text-body-sm text-muted">
        <Trans
          k="tesla.key.remove"
          components={{
            learn: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content -- Trans fills the text
              <a
                href="https://www.tesla.com/support"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline underline-offset-2"
              />
            ),
          }}
        />
      </p>
      {vehicleToAdd && (
        <div className="flex items-center gap-3 rounded-control bg-card px-3 py-2.5">
          <VehicleTile make={vehicleToAdd.make ?? ''} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-body-sm font-medium text-ink">
              {t('vehicle.name', {
                make: vehicleToAdd.make,
                model: vehicleToAdd.model,
                year: vehicleToAdd.year,
              })}
            </span>
            {vehicleToAdd.vin && (
              <span className="text-label font-normal text-muted">
                {t('tesla.key.vin', { vin: vehicleToAdd.vin })}
              </span>
            )}
          </span>
        </div>
      )}
    </>
  );
};

export default VirtualKeyStep;
