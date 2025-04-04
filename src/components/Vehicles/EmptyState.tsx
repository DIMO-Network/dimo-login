import { type FC } from 'react';
import { GooglePlayButton, AppStoreButton } from 'react-mobile-app-button';
import VehicleThumbnail from '../../assets/images/vehicle-thumbnail.png';
import { APK_URL, IOS_URL } from '../../utils/constants';
import { useUIManager } from '../../context/UIManagerContext';
import { ConnectCarButton } from '../Shared/ConnectCarButton';

export const EmptyState: FC = () => {
  const { setUiState } = useUIManager();

  return (
    <div className="flex flex-col items-center text-center gap-4 sm:gap-5 px-4 w-full max-w-sm sm:max-w-md mx-auto">
      {/* Vehicle Image */}
      <img
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover"
        src={VehicleThumbnail}
        alt="Vehicle Thumbnail"
      />

      {/* No Cars Connected */}
      <h2 className="text-gray-600 text-lg sm:text-xl font-medium">
        No cars connected yet
      </h2>

      {/* Connect Car Button */}
      <ConnectCarButton />

      {/* Download App Section */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-base font-medium">or Download the DIMO app now</p>
        <p className="text-sm text-gray-500">
          Connect your car in the DIMO app to share permissions.
        </p>

        {/* App Store & Google Play Buttons */}
        <div className="flex flex-row gap-3 w-full sm:w-auto">
          <AppStoreButton url={IOS_URL} theme="dark" className="!rounded-lg" />
          <GooglePlayButton url={APK_URL} theme="dark" className="!rounded-lg" />
        </div>
      </div>
    </div>
  );
};
