import { useAuthContext } from '../context/AuthContext';
import { useDevCredentials } from '../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../types';
import {
  AuthPayload,
  buildAuthPayload,
  sendAuthPayloadToParent,
} from '../utils/authUtils';
import { useSendOrSignInAgain } from './useSendOrSignInAgain';

export const useSendAuthPayloadToParent = () => {
  const { user, jwt } = useAuthContext();
  const { clientId, redirectUri } = useDevCredentials<VehicleManagerMandatoryParams>();
  const sendOrSignInAgain = useSendOrSignInAgain();

  return (
    extraPayload: Partial<AuthPayload> | null,
    onSuccess: (authPayload: any) => void,
  ) => {
    if (jwt && redirectUri && clientId) {
      sendOrSignInAgain(() => {
        const fullAuthPayload = {
          ...buildAuthPayload(clientId, jwt, user),
          ...extraPayload,
        };
        sendAuthPayloadToParent(fullAuthPayload, redirectUri, () =>
          onSuccess(fullAuthPayload),
        );
      });
    }
  };
};
