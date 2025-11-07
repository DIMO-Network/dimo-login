import React from 'react';

interface SharedPermissionsNoteProps {
  shared: boolean;
  hasUpdatedPermissions: boolean;
}

export const SharedPermissionsNote: React.FC<SharedPermissionsNoteProps> = ({
  shared,
  hasUpdatedPermissions,
}) => {
  if (!shared || hasUpdatedPermissions) {
    return null;
  }

  return (
    <p className="text-xs text-gray-500 mt-2">
      <span className="font-semibold">Note:</span> Shared with old permissions, revoke and
      re-share to ensure service continuity
    </p>
  );
};
