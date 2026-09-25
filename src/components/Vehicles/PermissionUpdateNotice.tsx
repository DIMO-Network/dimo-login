import React from 'react';
import { ArrowUpCircleIcon } from '@heroicons/react/20/solid';
import { Permission } from '@dimo-network/transactions';

import { getPermissionLabel } from '../../utils/permissions';

interface PermissionUpdateNoticeProps {
  brandName: string;
  vehicleCount: number;
  addedPermissions: Permission[];
  // Labels for requested files the current grants don't include.
  addedFiles?: string[];
}

/**
 * Shown above the vehicle list when the app is requesting a different permission
 * set than one or more vehicles were shared with. Those vehicles are preselected,
 * so the primary button updates them in place.
 */
export const PermissionUpdateNotice: React.FC<PermissionUpdateNoticeProps> = ({
  brandName,
  vehicleCount,
  addedPermissions,
  addedFiles = [],
}) => {
  const added = [...addedPermissions.map(getPermissionLabel), ...addedFiles];
  const vehicles = vehicleCount === 1 ? 'vehicle is' : `${vehicleCount} vehicles are`;
  const title = added.length
    ? `${brandName} is asking for more access`
    : `${brandName} updated the access it needs`;

  return (
    <section
      aria-live="polite"
      className="w-full max-w-[440px] mt-4 rounded-2xl border p-4 text-left border-[color-mix(in_srgb,var(--popup-brand-color,#000)_18%,white)] bg-[color-mix(in_srgb,var(--popup-brand-color,#000)_4%,white)]"
    >
      <div className="flex items-start gap-3">
        <ArrowUpCircleIcon
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-[var(--popup-brand-color,#000)]"
        />
        <div className="min-w-0">
          <h2 className="text-base font-medium text-black">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">
            Your {vehicles} shared with older permissions. Update to keep {brandName}{' '}
            working. You don&apos;t need to stop sharing first.
          </p>
          {!!added.length && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="New permissions">
              {added.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-black"
                >
                  + {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default PermissionUpdateNotice;
