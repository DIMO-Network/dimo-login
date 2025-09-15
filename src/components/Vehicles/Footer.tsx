import React from 'react';
import PrimaryButton from '../Shared/PrimaryButton';

interface FooterProps {
  canShare: boolean;
  onCancel: () => void;
  onShare: () => void;
  selectedVehiclesCount: number;
  hasOldPermissions: boolean;
}

const Footer = ({
  canShare,
  onCancel,
  onShare,
  selectedVehiclesCount,
  hasOldPermissions,
}: FooterProps) => {
  const showContinueButton = !canShare;
  const showUpdatePermissionsButton = hasOldPermissions && canShare;
  const showShareButtons = !hasOldPermissions && canShare;

  const renderContinueButton = () => {
    return (
      <div className="flex flex-row gap-2 justify-center">
        <PrimaryButton onClick={onCancel}>Continue</PrimaryButton>
      </div>
    );
  };

  const renderCancelAndShareButtons = () => {
    return (
      <div className="grid grid-cols-2 gap-4 justify-between">
        <button
          onClick={onCancel}
          className="bg-white font-medium text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
        >
          Cancel
        </button>
        <PrimaryButton onClick={onShare} disabled={selectedVehiclesCount === 0}>
          Save changes
        </PrimaryButton>
      </div>
    );
  };

  const renderUpdatePermissionsButton = () => {
    return (
      <div className="flex flex-row gap-2">
        <PrimaryButton onClick={onCancel} className="w-full">
          Update vehicles permissions
        </PrimaryButton>
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-4 w-full max-w-[440px] pt-4`}>
      {showContinueButton && renderContinueButton()}
      {showUpdatePermissionsButton && renderUpdatePermissionsButton()}
      {showShareButtons && renderCancelAndShareButtons()}
    </div>
  );
};

export default Footer;
