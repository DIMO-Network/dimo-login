import React, { FC } from 'react';

interface PermissionsStepProps {
  devLicenseAlias: string;
}

export const PermissionsStep: FC<PermissionsStepProps> = ({ devLicenseAlias }) => (
  <>
    <div className="w-full text-gray-600 text-sm text-center">
      {devLicenseAlias} requires access to your car’s data to offer you charging
      incentives.
    </div>

    <div className="flex flex-col gap-[10px] w-full">
      {[
        { name: 'Vehicle information', type: 'required' },
        { name: 'Vehicle location', type: 'required' },
        { name: 'Profile', type: 'recommended' },
        { name: 'Vehicle commands', type: 'recommended' },
        {
          name: 'Vehicle charging management',
          type: 'recommended',
        },
      ].map((permission) => (
        <div
          key={permission.name}
          className="flex justify-between items-center p-4 border border-gray-200 rounded-2xl w-full"
        >
          <span className="text-black font-normal">{permission.name}</span>
          <span
            className={`px-3 py-1 text-sm font-normal rounded-full ${
              permission.type === 'required'
                ? 'bg-[#E80303] text-white'
                : 'bg-[#E4E4E7] text-[#3F3F46]'
            }`}
          >
            {permission.type === 'required' ? 'Required' : 'Recommended'}
          </span>
        </div>
      ))}
    </div>
  </>
);

export default PermissionsStep;
