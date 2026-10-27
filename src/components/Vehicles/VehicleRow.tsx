import React, { useId } from 'react';

import { Checkbox } from '../ui';
import { cn } from '../ui/cn';
import { useT } from '../../i18n';
import { Vehicle } from '../../models/vehicle';

export const useVehicleName = () => {
  const t = useT();
  return ({ make, model, year }: Pick<Vehicle, 'make' | 'model' | 'year'>) =>
    t('vehicle.name', { make, model, year }).trim();
};

/** A make's initial on a tile: no stock photo pretending to be the user's car. */
export const VehicleTile = ({ make, muted }: { make: string; muted?: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex size-9 shrink-0 items-center justify-center rounded-control bg-highest text-body-sm font-semibold',
      muted ? 'text-muted' : 'text-ink',
    )}
  >
    {make.trim().charAt(0).toUpperCase() || '?'}
  </span>
);

/**
 * One vehicle in a list. Selectable rows are a checkbox whose label is the
 * whole row; an action (Manage) sits outside the label so it stays its own
 * control.
 */
export const VehicleRow = ({
  vehicle,
  selectable = false,
  selected = false,
  onToggle,
  meta,
  status,
  action,
  muted = false,
}: {
  vehicle: Vehicle;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** After the ID on the first line, e.g. "Not shared yet". */
  meta?: React.ReactNode;
  /** A line of its own: a status chip and any note. */
  status?: React.ReactNode;
  action?: React.ReactNode;
  muted?: boolean;
}) => {
  const t = useT();
  const name = useVehicleName();
  const id = useId();
  const Text = selectable ? 'label' : 'span';

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-control bg-card px-3 py-2.5 transition-[background-color,box-shadow] duration-150',
        selectable && 'hover:bg-control',
        selected && 'bg-control shadow-selected',
      )}
    >
      {selectable && (
        <Checkbox id={id} checked={selected} onChange={() => onToggle?.()} />
      )}
      <Text
        {...(selectable && { htmlFor: id })}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3',
          selectable && 'cursor-pointer',
        )}
      >
        <VehicleTile make={vehicle.make} muted={muted} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={cn(
              'truncate text-body-sm font-medium',
              muted ? 'text-muted' : 'text-ink',
            )}
          >
            {name(vehicle)}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label font-normal text-muted">
            <span>{t('vehicle.id', { id: vehicle.tokenId })}</span>
            {meta && (
              <>
                <span aria-hidden="true">·</span>
                <span>{meta}</span>
              </>
            )}
          </span>
          {status && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label font-normal text-muted">
              {status}
            </span>
          )}
        </span>
      </Text>
      {action}
    </div>
  );
};

export default VehicleRow;
