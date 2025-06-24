import { useAuthContext } from '../context/AuthContext';
import { useUIManager } from '../context/UIManagerContext';
import { fetchUserDetails } from '../services';
import { UiStates } from '../enums';

export const useProcessEmailSubmission = () => {
  const { setUser } = useAuthContext();
  const { setUiState } = useUIManager();

  return async (email: string) => {
    const userExistsResult = await fetchUserDetails(email);
    if (userExistsResult.success && userExistsResult.data.user) {
      setUser(userExistsResult.data.user);
      return setUiState(UiStates.PASSKEY_LOGIN);
    }
    setUiState(UiStates.PASSKEY_GENERATOR, { setBack: true });
  };
};
