import { useDevCredentials } from '../context/DevCredentialsContext';
import { AccountManagerMandatoryParams } from '../types';
import { useUIManager } from '../context/UIManagerContext';
import { useSendAuthPayloadToParent } from './useSendAuthPayloadToParent';
import { UiStates } from '../enums';
import { backToThirdParty } from '../utils/messageHandler';

// Account-sharing analogue of useFinishShareVehicles: surfaces accountGranted +
// transactionHash to the parent, then advances to the success screen (popup) or
// redirects back to the third party (redirect mode, no transactionHash).
export const useFinishShareAccounts = () => {
  const { redirectUri, utm } = useDevCredentials<AccountManagerMandatoryParams>();
  const { setUiState, setComponentData } = useUIManager();
  const sendAuthPayloadToParent = useSendAuthPayloadToParent();

  return (transactionHash?: string) => {
    sendAuthPayloadToParent({ accountGranted: true, transactionHash }, (authPayload) => {
      setComponentData({ action: 'account-shared' });
      setUiState(UiStates.ACCOUNT_PERMISSIONS_SUCCESS);
      if (!transactionHash) backToThirdParty(authPayload, redirectUri, utm);
    });
  };
};
