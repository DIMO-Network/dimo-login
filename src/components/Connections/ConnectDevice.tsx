import { type FC } from 'react';

import PhysicalAdapter from '../../assets/images/physical-adapter.png';
import { Header, PrimaryButton } from '../Shared';
import { useUIManager } from '../../context/UIManagerContext';
import { getAppUrl } from '../../utils/urlHelpers';
import { IOS_URL, SHOP_DIMO_URL } from '../../utils/constants';
import { useDevCredentials } from '../../context/DevCredentialsContext';

export const ConnectDevice: FC = () => {
  const { componentData, goBack } = useUIManager(); // Access the manage function from the context
  const { devLicenseAlias } = useDevCredentials();
  const appUrl = getAppUrl();

  return (
    <>
      {/* Header */}
      <Header
        title={`Connect Data Source for ${componentData.modelYear} ${componentData.makeModel}`}
        subtitle={appUrl.hostname}
      />

      {/* Text Wrapper - Restrict Width */}
      <div className="max-w-[480px] text-gray-600 text-sm text-center">
        A physical adapter is required to connect this car to {devLicenseAlias}. Device
        connection is currently only supported inside the DIMO Mobile app.
      </div>

      {/* Adapter Image */}
      <div className="flex justify-center pt-2">
        <img
          style={{ height: '120px', width: '120px' }}
          className="rounded-full object-cover"
          src={PhysicalAdapter}
          alt="DIMO Adapter"
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col w-full max-w-[480px] px-4 space-y-3">
        <PrimaryButton onClick={() => window.open(IOS_URL, '_blank')} width="w-full py-3">
          Go to the DIMO App
        </PrimaryButton>

        <button
          onClick={() => window.open(SHOP_DIMO_URL, '_blank')}
          className="w-full border border-gray-300 bg-white font-medium text-black px-4 py-3 rounded-3xl hover:text-gray-500"
        >
          Shop Devices
        </button>

        {/* Smaller "Later" button */}
        <button onClick={goBack} className="text-gray-500 text-sm hover:text-black mt-2">
          Later
        </button>
      </div>
    </>
  );
};
