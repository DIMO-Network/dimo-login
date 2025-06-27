import React from 'react';
import PrimaryButton from '../Shared/PrimaryButton';

const Footer = ({
  canShare,
  onCancel,
  onShare,
  selectedVehiclesCount,
}: {
  canShare: boolean;
  onCancel: () => void;
  onShare: () => void;
  selectedVehiclesCount: number;
}) => {
  return (
    <div
      className={`grid grid-flow-col auto-cols-fr gap-4 ${
        canShare ? 'justify-between' : 'justify-center'
      } w-full max-w-[440px] pt-4`}
    >
      {!canShare && <PrimaryButton onClick={onCancel}>Continue</PrimaryButton>}
      {canShare && (
        <>
          <button
            onClick={onCancel}
            className="bg-white font-medium text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
          >
            Cancel
          </button>
          <PrimaryButton onClick={onShare} disabled={selectedVehiclesCount === 0}>
            Save changes
          </PrimaryButton>
        </>
      )}
    </div>
  );
};

export default Footer;
