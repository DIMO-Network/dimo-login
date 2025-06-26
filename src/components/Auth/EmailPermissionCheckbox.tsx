import { Checkbox } from '../Shared';
import React from 'react';

export const EmailPermissionCheckbox = ({
  isChecked,
  onChange,
  devLicenseAlias,
}: {
  isChecked: boolean;
  onChange: () => void;
  devLicenseAlias: string;
}) => {
  return (
    <div className="flex justify-center items-center">
      <label
        htmlFor="share-email"
        className="flex justify-center items-center text-sm mb-4 cursor-pointer"
      >
        <Checkbox
          onChange={onChange}
          name="share-email"
          id="share-email"
          className="mr-2"
          checked={isChecked}
        />
        I agree to share my email with {devLicenseAlias}
      </label>
    </div>
  );
};
