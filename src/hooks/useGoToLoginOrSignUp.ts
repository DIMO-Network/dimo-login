import { useAuthContext } from '../context/AuthContext';
import { useUIManager } from '../context/UIManagerContext';
import { fetchUserDetails } from '../services/accountsService';
import { UiStates } from '../enums';
import { useSignUp } from './useSignUp';

export const useGoToLoginOrSignUp = () => {
  const { setUser } = useAuthContext();
  const { setUiState } = useUIManager();
  const signUp = useSignUp();

  return async (email: string, proofToken?: string) => {
    const userAccount = await fetchUserDetails(email);
    // An account whose email was never verified has no trusted passkey yet:
    // it goes through sign-up again rather than passkey login.
    if (userAccount && userAccount.emailVerified !== false) {
      setUser(userAccount);
      return setUiState(UiStates.PASSKEY_LOGIN);
    }
    await signUp.start(email, proofToken);
  };
};
