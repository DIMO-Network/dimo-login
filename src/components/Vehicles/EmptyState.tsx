import React, { type FC } from 'react';

import { GooglePlayButton, AppStoreButton } from 'react-mobile-app-button';

import VehicleThumbnail from '@assets/images/vehicle-thumbnail.png';

export const EmptyState: FC = () => {
  const APK_URL =
    'https://play.google.com/store/apps/details?id=com.dimo.driver&utm_source=DIMO%20Website&utm_medium=website&utm_campaign=website_notification_bar';

  const IOS_URL =
    'https://apps.apple.com/app/apple-store/id1589486727?pt=123590868&ct=dimo_website&mt=8';

  return (
    <div className="flex flex-col items-center gap-6">
      <img
        style={{ height: '40px', width: '40px' }}
        className="rounded-full object-cover mr-4"
        src={VehicleThumbnail}
        alt="Vehicle Thumbnail"
      />
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-gray-500 text-xl font-medium">
          No cars connected yet
        </h2>
        <p className="text-sm">
          Connect your car in the DIMO app to share permissions.
        </p>
      </div>
      <div className="flex flex-col items-center gap-6">
        <p className="text-xl font-medium">Download the DIMO app now</p>
        <div className="flex flex-row gap-6">
          <AppStoreButton
            url={IOS_URL}
            theme="dark"
            className="!rounded-full"
          />
          <GooglePlayButton
            url={APK_URL}
            theme="dark"
            className="!rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
