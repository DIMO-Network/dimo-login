import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import { useUIManager } from '../context/UIManagerContext';
import { useSendAuthPayloadToParent } from './useSendAuthPayloadToParent';
import { Vehicle } from '../models/vehicle';
import { UiStates } from '../enums';
import { ShareResult } from './useShareVehicles';
import { backToThirdParty } from '../utils/messageHandler';

export const useFinishShareVehicles = () => {
  const { redirectUri, utm } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setUiState, setComponentData } = useUIManager();
  const sendAuthPayloadToParent = useSendAuthPayloadToParent();

  const goToNextScreen = (sharedVehicles: Vehicle[], skipped: ShareResult['skipped']) => {
    setComponentData({ action: 'shared', vehicles: sharedVehicles, skipped });
    setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
  };

  return (sharedVehicles?: Vehicle[], skipped: ShareResult['skipped'] = []) => {
    sendAuthPayloadToParent(
      {
        sharedVehicles: sharedVehicles?.map((v) => v.tokenId.toString()),
      },
      (authPayload) => {
        if (sharedVehicles?.length) {
          return goToNextScreen(sharedVehicles, skipped);
        }
        backToThirdParty(authPayload, redirectUri, utm);
      },
    );
  };
};
