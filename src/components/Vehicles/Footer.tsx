import React from 'react';
import PrimaryButton from '../Shared/PrimaryButton';
import LegalNotice from '../Shared/LegalNotice';

const pluralize = (count: number) => `${count} ${count === 1 ? 'vehicle' : 'vehicles'}`;

// Name the button after what it will do: share new vehicles, update existing
// shares to the requested permissions, or both.
export const getShareButtonLabel = (selectedCount: number, updateCount: number) => {
  const newCount = selectedCount - updateCount;
  if (selectedCount === 0) return 'Share vehicles';
  if (updateCount === 0) return `Share ${pluralize(newCount)}`;
  if (newCount === 0) return `Update ${pluralize(updateCount)}`;
  return `Share and update ${pluralize(selectedCount)}`;
};

const Footer = ({
  canShare,
  onCancel,
  onShare,
  selectedVehiclesCount,
  selectedUpdateCount = 0,
  tosUrl,
  privacyPolicyUrl,
  brandName,
}: {
  canShare: boolean;
  onCancel: () => void;
  onShare: () => void;
  selectedVehiclesCount: number;
  selectedUpdateCount?: number;
  tosUrl?: string;
  privacyPolicyUrl?: string;
  brandName?: string;
}) => {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[440px] pt-4">
      <LegalNotice tosUrl={tosUrl} privacyPolicyUrl={privacyPolicyUrl} brandName={brandName} />
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
              {getShareButtonLabel(selectedVehiclesCount, selectedUpdateCount)}
            </PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
};

export default Footer;
