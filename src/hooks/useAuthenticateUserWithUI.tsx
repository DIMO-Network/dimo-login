import { useUIManager } from '../context/UIManagerContext';
import { useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { passkeyStamper } from '../services';
import { TStamper } from '@turnkey/http/dist/base';

export const useAuthenticateUserWithUI = () => {
  const { authenticateUser } = useAuthContext();
  const { setLoadingState, setError } = useUIManager();
  return useCallback(
    async (stamper: TStamper = passkeyStamper) => {
      try {
        setLoadingState(true, 'Authenticating user');
        setError(null);
        await authenticateUser(stamper);
      } catch (err) {
        console.log(err);
        setError('Failed to authenticate user. Please try again.');
      } finally {
        setLoadingState(false);
      }
    },
    [authenticateUser, setError, setLoadingState],
  );
};
