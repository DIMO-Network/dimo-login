import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';

import { Button, StatusChip } from '../ui';
import { formatDate, formatList } from '../../i18n/format';
import { useT } from '../../i18n';
import { Vehicle } from '../../models/vehicle';
import { grantEndOf } from '../../utils/dateUtils';
import { useVehicleName, VehicleRow } from './VehicleRow';

/** "Ready to share 2": a group of rows under a small label with its count. */
export const VehicleGroup = ({
  label,
  count,
  note,
  children,
}: {
  label: string;
  count: number;
  note?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5" role="group" aria-label={label}>
    <p className="flex gap-1.5 px-0.5 text-label text-muted" aria-hidden="true">
      {label}
      <span>{count}</span>
    </p>
    {children}
    {note && <p className="px-0.5 pt-0.5 text-label font-normal text-muted">{note}</p>}
  </div>
);

/** Placeholder rows while a page of vehicles loads. */
export const VehicleSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="flex flex-col gap-1.5" aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 rounded-control bg-card px-3 py-2.5"
      >
        <span className="size-9 shrink-0 animate-pulse rounded-control bg-highest" />
        <span className="flex flex-1 flex-col gap-1.5">
          <span className="h-3.5 w-2/5 animate-pulse rounded-chip bg-highest" />
          <span className="h-3 w-1/4 animate-pulse rounded-chip bg-highest" />
        </span>
      </div>
    ))}
  </div>
);

export const AddVehicleRow = ({ onClick }: { onClick: () => void }) => {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-control border border-dashed border-outline px-3 py-2.5 text-left text-body-sm font-medium text-ink transition-colors hover:bg-card"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-card">
        <PlusIcon className="size-[18px]" aria-hidden="true" />
      </span>
      {t('share.add_vehicle')}
    </button>
  );
};

export const ReadyVehicleRow = ({
  vehicle,
  selected,
  onToggle,
}: {
  vehicle: Vehicle;
  selected: boolean;
  onToggle: () => void;
}) => {
  const t = useT();
  return (
    <VehicleRow
      vehicle={vehicle}
      selectable
      selected={selected}
      onToggle={onToggle}
      meta={t('vehicle.not_shared')}
    />
  );
};

/** "Shared until …" or "Shared, no end date", from the grant's own expiry. */
export const SharedStatus = ({ vehicle }: { vehicle: Vehicle }) => {
  const t = useT();
  const end = grantEndOf(vehicle.grantExpiresAt);
  return (
    <StatusChip tone="on">
      {!end || end.noEnd
        ? t('vehicle.shared_no_end')
        : t('vehicle.shared_until', { date: formatDate(end.date) })}
    </StatusChip>
  );
};

/**
 * A vehicle already shared with this app. Up to date: its status and Manage.
 * Behind the request: selectable, with what an update adds. While its file
 * access is being checked it says so, so it doesn't jump groups later.
 */
export const SharedVehicleRow = ({
  vehicle,
  needsUpdate,
  added,
  selected,
  onToggle,
  onManage,
}: {
  vehicle: Vehicle;
  needsUpdate: boolean;
  /** Labels of what an update adds. */
  added: string[];
  selected: boolean;
  onToggle: () => void;
  onManage: () => void;
}) => {
  const t = useT();
  const name = useVehicleName();
  const checking = !!vehicle.checkingAccess && !needsUpdate;

  let status: React.ReactNode;
  if (checking) {
    status = <StatusChip tone="checking">{t('vehicle.checking')}</StatusChip>;
  } else if (needsUpdate) {
    status = (
      <>
        <StatusChip tone="pending">{t('vehicle.needs_update')}</StatusChip>
        {!!added.length && <span>{t('vehicle.adds', { list: formatList(added) })}</span>}
      </>
    );
  } else {
    status = <SharedStatus vehicle={vehicle} />;
  }

  return (
    <VehicleRow
      vehicle={vehicle}
      selectable={needsUpdate}
      selected={needsUpdate && selected}
      onToggle={onToggle}
      status={status}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={onManage}
          aria-label={t('vehicle.manage_label', { vehicle: name(vehicle) })}
        >
          {t('vehicle.manage')}
        </Button>
      }
    />
  );
};

export const UnsupportedVehicleRow = ({ vehicle }: { vehicle: Vehicle }) => {
  const t = useT();
  return (
    <VehicleRow
      vehicle={vehicle}
      muted
      status={<StatusChip tone="off">{t('vehicle.unsupported')}</StatusChip>}
    />
  );
};

export const Pager = ({
  page,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  disabled = false,
}: {
  page: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}) => {
  const t = useT();
  if (!hasNext && !hasPrevious) return null;
  return (
    <nav
      className="flex items-center justify-between gap-2 text-label font-normal text-muted"
      aria-label={t('pager.page', { page })}
    >
      <span>{t('pager.page', { page })}</span>
      <span className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious || disabled}
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
          {t('pager.previous')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onNext}
          disabled={!hasNext || disabled}
        >
          {t('pager.next')}
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Button>
      </span>
    </nav>
  );
};
