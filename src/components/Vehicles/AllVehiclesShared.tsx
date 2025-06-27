import React from 'react';

export const AllVehiclesShared = ({ devLicenseAlias }: { devLicenseAlias: string }) => {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-gray-500 text-xl font-medium pt-2">
        All vehicles have been shared
      </h2>
      <p className="text-sm">
        You have already shared all your vehicles with {devLicenseAlias}.
      </p>
    </div>
  );
};
