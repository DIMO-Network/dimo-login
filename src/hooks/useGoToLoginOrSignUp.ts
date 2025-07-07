import { useAuthContext } from '../context/AuthContext';
import { useUIManager } from '../context/UIManagerContext';
import { fetchUserDetails } from '../services';
import { UiStates } from '../enums';

export const useGoToLoginOrSignUp = () => {
  const { setUser } = useAuthContext();
  const { setUiState } = useUIManager();

  return async (email: string) => {
    const userAccount = await fetchUserDetails(email);
    if (userAccount) {
      setUser(userAccount);
      return setUiState(UiStates.PASSKEY_LOGIN);
    }
    setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
  };
};
