import PrimaryButton from '../Shared/PrimaryButton';
import React from 'react';

interface FooterProps {
  onRevoke: () => void;
  onExtend: () => void;
}

export const ManageVehicleFooter = ({ onRevoke, onExtend }: FooterProps) => {
  return (
    <div className="flex mt-8 justify-center gap-2">
      <button
        onClick={onRevoke}
        className="font-medium justify-center px-4 py-2 w-[214px] rounded-3xl border border-gray-300 bg-white text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        Stop Sharing
      </button>
      <PrimaryButton onClick={onExtend} width="w-[214px]">
        Extend (1 year)
      </PrimaryButton>
    </div>
  );
};
