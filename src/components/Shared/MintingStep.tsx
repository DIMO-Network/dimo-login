import React, { FC } from 'react';

interface MintingStepProps {
  devLicenseAlias: string;
}

export const MintingStep: FC<MintingStepProps> = ({ devLicenseAlias }) => (
  <>
    <div className="w-full text-gray-600 text-sm text-center">
      Your Tesla is now connected! You can now access vehicle data and commands via{' '}
      {devLicenseAlias}.
    </div>
    <p className="text-lg font-medium text-black">All set! 🚀</p>
  </>
);

export default MintingStep;