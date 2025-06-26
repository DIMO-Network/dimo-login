import { useDevCredentials } from '../context/DevCredentialsContext';
import { useOracles } from '../context/OraclesContext';
import { useUIManager } from '../context/UIManagerContext';
import { AuthProvider, constructAuthUrl } from '../utils/authUrls';
import { UiStates } from '../enums';

export const useConstructOAuthUrl = () => {
  const { clientId, redirectUri } = useDevCredentials();
  const { onboardingEnabled } = useOracles();
  const { altTitle } = useUIManager();

  return (provider: AuthProvider, emailPermissionGranted: boolean) => {
    const urlParams = new URLSearchParams(window.location.search);
    return constructAuthUrl({
      provider,
      clientId,
      redirectUri,
      entryState: UiStates.EMAIL_INPUT,
      expirationDate: urlParams.get('expirationDate'),
      permissionTemplateId: urlParams.get('permissionTemplateId'),
      utm: urlParams.getAll('utm'),
      vehicleMakes: urlParams.getAll('vehicleMakes'),
      vehicles: urlParams.getAll('vehicles'),
      powertrainTypes: urlParams.getAll('powertrainTypes'),
      onboarding: onboardingEnabled ? ['tesla'] : [], //TODO: Should have full onboarding array here
      altTitle,
      emailPermissionGranted,
    });
  };
};
