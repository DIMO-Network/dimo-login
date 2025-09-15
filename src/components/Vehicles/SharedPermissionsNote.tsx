import React from 'react';

interface SharedPermissionsNoteProps {
  shared: boolean;
  hasOldPermissions: boolean;
}

export const SharedPermissionsNote: React.FC<SharedPermissionsNoteProps> = ({
  shared,
  hasOldPermissions,
}) => {
  if (!shared || !hasOldPermissions) {
    return null;
  }

  return (
    <p className="text-xs text-gray-500 mt-2">
      <span className="font-semibold">Note:</span> Shared with old permissions, update
      them before continuing
    </p>
  );
};
