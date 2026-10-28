import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import { useUIManager } from '../context/UIManagerContext';
import { useSendAuthPayloadToParent } from './useSendAuthPayloadToParent';
import { SharingResult } from '../models/vehicle';
import { UiStates } from '../enums';
import { ShareResult } from './useShareVehicles';
import { backToThirdParty } from '../utils/messageHandler';

/**
 * How a change is reported to the app, by key: `sharedVehicles` (shares and
 * updates), `extendedVehicles`, `revokedVehicles`. Redirect mode sends the same
 * key in the query when the done screen's Back is pressed.
 */
export type VehiclesAction = 'shared' | 'extended' | 'revoked';

/**
 * Tells the app what changed, then shows the done screen. Popup and embed apps
 * get an authResponse now, since the done screen's Back only closes the popup.
 * With nothing changed (Cancel), it goes straight back to the app.
 */
export const useFinishVehicles = () => {
  const { redirectUri, utm } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setUiState, setComponentData } = useUIManager();
  const sendAuthPayloadToParent = useSendAuthPayloadToParent();

  return (
    action: VehiclesAction,
    results: SharingResult[] = [],
    skipped: ShareResult['skipped'] = [],
  ) => {
    const tokenIds = results.map((r) => r.vehicle.tokenId.toString());
    sendAuthPayloadToParent({ [`${action}Vehicles`]: tokenIds }, (authPayload) => {
      if (results.length) {
        setComponentData({ action, results, skipped });
        setUiState(UiStates.VEHICLES_SHARED_SUCCESS);
        return;
      }
      backToThirdParty(authPayload, redirectUri, utm);
    });
  };
};

/** Shares and updates from the vehicle list; an empty list is Cancel. */
export const useFinishShareVehicles = () => {
  const finish = useFinishVehicles();
  return (results: SharingResult[] = [], skipped: ShareResult['skipped'] = []) =>
    finish('shared', results, skipped);
};
