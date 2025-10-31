import { useDevCredentials } from '../context/DevCredentialsContext';
import { AccountManagerMandatoryParams } from '../types';
import { useUIManager } from '../context/UIManagerContext';
import { useSendAuthPayloadToParent } from './useSendAuthPayloadToParent';
import { Vehicle } from '../models/vehicle';
import { UiStates } from '../enums';
import { backToThirdParty } from '../utils/messageHandler';

export const useFinishShareAccount = () => {
  const { redirectUri, utm } = useDevCredentials<AccountManagerMandatoryParams>();
  const { setUiState, componentData } = useUIManager();
  const sendAuthPayloadToParent = useSendAuthPayloadToParent();

  const goToSuccessScreen = () => {
    setUiState(UiStates.ACCOUNT_SHARED_SUCCESS);
  };

  return () => {
    // Get vehicles that were shared in previous step (if any)
    const sharedVehicles: Vehicle[] = componentData?.sharedVehicles || [];

    sendAuthPayloadToParent(
      {
        sharedVehicles: sharedVehicles.map((v) => v.tokenId.toString()),
        accountShared: true,
      },
      (authPayload) => {
        backToThirdParty(authPayload, redirectUri, utm, goToSuccessScreen);
      },
    );
  };
};
