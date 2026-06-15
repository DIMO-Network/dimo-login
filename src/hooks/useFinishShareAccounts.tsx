import { useUIManager } from '../context/UIManagerContext';
import { useSendAuthPayloadToParent } from './useSendAuthPayloadToParent';
import { UiStates } from '../enums';

// Account-sharing analogue of useFinishShareVehicles: surfaces accountGranted to
// the parent, then shows the success screen. AccountPermissionsSuccess owns the
// "Back to <app>" return action (and embedders navigate themselves), so we must
// NOT call backToThirdParty here — doing so closed the popup before the success
// screen was ever shown.
export const useFinishShareAccounts = () => {
  const { setUiState, setComponentData } = useUIManager();
  const sendAuthPayloadToParent = useSendAuthPayloadToParent();

  return () => {
    sendAuthPayloadToParent({ accountGranted: true }, () => {
      setComponentData({ action: 'account-shared' });
      setUiState(UiStates.ACCOUNT_PERMISSIONS_SUCCESS);
    });
  };
};
