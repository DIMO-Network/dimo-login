import React, { FC } from 'react';

interface PermissionsStepProps {
  devLicenseAlias: string;
}

enum PermissionType {
  REQUIRED = 'required',
  RECOMMENDED = 'recommended',
}

type Permission = {
  name: string;
  type: PermissionType;
};

const permissions: Permission[] = [
  { name: 'Vehicle information', type: PermissionType.REQUIRED },
  { name: 'Vehicle location', type: PermissionType.REQUIRED },
  { name: 'Profile', type: PermissionType.RECOMMENDED },
  { name: 'Vehicle commands', type: PermissionType.RECOMMENDED },
  { name: 'Vehicle charging management', type: PermissionType.RECOMMENDED },
];

export const PermissionsStep: FC<PermissionsStepProps> = ({ devLicenseAlias }) => {
  const renderPermission = ({ name, type }: Permission) => {
    const typeMap = {
      [PermissionType.REQUIRED]: {
        badgeClass: 'bg-[#E80303] text-white',
        badgeText: 'Required',
      },
      [PermissionType.RECOMMENDED]: {
        badgeClass: 'bg-[#E4E4E7] text-[#3F3F46]',
        badgeText: 'Recommended',
      },
    };

    const { badgeClass, badgeText } = typeMap[type];

    return (
      <div
        key={name}
        className="flex justify-between items-center p-4 border border-gray-200 rounded-2xl w-full"
      >
        <span className="text-black font-normal">{name}</span>
        <span className={`px-3 py-1 text-sm font-normal rounded-full ${badgeClass}`}>
          {badgeText}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="w-full text-gray-600 text-sm text-center">
        {devLicenseAlias} requires access to your car's data to offer you their service.
      </div>

      <div className="flex flex-col gap-[10px] w-full">
        {permissions.map(renderPermission)}
      </div>
    </>
  );
};

export default PermissionsStep;
