import React from 'react';
import { Permission } from '@dimo-network/transactions';

import { getPermissionLabel } from '../../utils/permissions';

interface SharedPermissionsNoteProps {
  addedPermissions: Permission[];
}

// Per-vehicle hint for a vehicle shared with an older permission set.
export const SharedPermissionsNote: React.FC<SharedPermissionsNoteProps> = ({
  addedPermissions,
}) => {
  return (
    <p className="text-xs text-gray-600 mt-2">
      {addedPermissions.length
        ? `Update adds: ${addedPermissions.map(getPermissionLabel).join(', ')}`
        : 'Shared with an older set of permissions'}
    </p>
  );
};

export const UpdateNeededBadge: React.FC = () => (
  <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 text-[var(--popup-brand-color,#000)] bg-[color-mix(in_srgb,var(--popup-brand-color,#000)_10%,white)]">
    Update needed
  </span>
);
