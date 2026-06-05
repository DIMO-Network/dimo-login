import React from 'react';
import PrimaryButton from '../Shared/PrimaryButton';
import LegalNotice from '../Shared/LegalNotice';

const Footer = ({
  canShare,
  onCancel,
  onShare,
  selectedVehiclesCount,
  tosUrl,
  brandName,
}: {
  canShare: boolean;
  onCancel: () => void;
  onShare: () => void;
  selectedVehiclesCount: number;
  tosUrl?: string;
  brandName?: string;
}) => {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[440px] pt-4">
      <LegalNotice tosUrl={tosUrl} brandName={brandName} />
      <div
        className={`grid grid-flow-col auto-cols-fr gap-4 ${
          canShare ? 'justify-between' : 'justify-center'
        } w-full`}
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
    </div>
  );
};

export default Footer;
