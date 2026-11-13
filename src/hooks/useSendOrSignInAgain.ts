import { useAuthContext } from '../context/AuthContext';
import { isTokenExpiredError } from '../utils/authUtils';

/**
 * Runs a send to the app. When this tab's token is too near its end to send
 * (buildAuthPayload refuses it), the user signs in again instead, as with "Use
 * another account": the app never gets a dead token, and the screen never
 * stays on a button that does nothing.
 */
export const useSendOrSignInAgain = () => {
  const { switchAccount } = useAuthContext();
  return (send: () => void) => {
    try {
      send();
    } catch (error) {
      if (!isTokenExpiredError(error)) throw error;
      switchAccount();
    }
  };
};
