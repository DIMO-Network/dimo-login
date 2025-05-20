import { useUIManager } from '../context/UIManagerContext';
import { useCallback } from 'react';
import { UserObject } from '../models/user';
import { useAuthContext } from '../context/AuthContext';

export const useHandleAuthenticateUser = () => {
  const { authenticateUser } = useAuthContext();
  const { setLoadingState, setError, entryState } = useUIManager();
  return useCallback(
    async (account: UserObject) => {
      try {
        setLoadingState(true, 'Authenticating user');
        setError(null);
        await authenticateUser(account, entryState);
      } catch (err) {
        setError('Failed to authenticate user. Please try again.');
      } finally {
        setLoadingState(false);
      }
    },
    [authenticateUser, entryState, setError, setLoadingState],
  );
};
