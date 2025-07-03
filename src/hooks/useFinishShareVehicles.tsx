import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import { useUIManager } from '../context/UIManagerContext';
import { useSendAuthPayloadToParent } from './useSendAuthPayloadToParent';
import { Vehicle } from '../models/vehicle';
import { UiStates } from '../enums';
import { backToThirdParty } from '../utils/messageHandler';

export const useFinishShareVehicles = () => {
  const { redirectUri, utm } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setUiState, setComponentData } = useUIManager();
  const sendAuthPayloadToParent = useSendAuthPayloadToParent();

  const goToNextScreen = (sharedVehicles: Vehicle[]) => {
    setComponentData({ action: 'shared', vehicles: sharedVehicles });
    setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
  };

  return (sharedVehicles?: Vehicle[]) => {
    sendAuthPayloadToParent(
      {
        sharedVehicles: sharedVehicles?.map((v) => v.tokenId.toString()),
      },
      (authPayload) => {
        if (sharedVehicles?.length) {
          return goToNextScreen(sharedVehicles);
        }
        backToThirdParty(authPayload, redirectUri, utm);
      },
    );
  };
};
