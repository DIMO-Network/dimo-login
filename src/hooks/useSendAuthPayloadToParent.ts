import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import {
  AuthPayload,
  buildAuthPayload,
  sendAuthPayloadToParent,
} from '../utils/authUtils';

export const useSendAuthPayloadToParent = () => {
  const { user, jwt } = useAuthContext();
  const { clientId, redirectUri } = useDevCredentials<VehicleManagerMandatoryParams>();

  return (
    extraPayload: Partial<AuthPayload> | null,
    onSuccess: (authPayload: any) => void,
  ) => {
    if (jwt && redirectUri && clientId) {
      const authPayloadWithVehicles = {
        ...buildAuthPayload(clientId, jwt, user),
        ...extraPayload,
      };
      sendAuthPayloadToParent(authPayloadWithVehicles, redirectUri, () =>
        onSuccess(authPayloadWithVehicles),
      );
    }
  };
};
