import { useDevCredentials } from '../context/DevCredentialsContext';
import { useOracles } from '../context/OraclesContext';
import { useUIManager } from '../context/UIManagerContext';
import { AuthProvider, constructAuthUrl } from '../utils/authUrls';
import { buildFlowSnapshot, saveFlowSnapshot } from '../utils/flowSnapshot';
import { UiStates } from '../enums';

export const useConstructOAuthUrl = () => {
  const devCredentials = useDevCredentials();
  const { clientId, redirectUri, cloudEvent } = devCredentials;
  const { onboardingEnabled } = useOracles();
  const { altTitle, entryState } = useUIManager();

  return (provider: AuthProvider, emailPermissionGranted: boolean) => {
    const urlParams = new URLSearchParams(window.location.search);
    // The flow (share vehicles, documents, a transaction…) is restored from this
    // snapshot on return; the URL params below only cover the redirect mode
    // when storage is unavailable.
    const flowRef = saveFlowSnapshot(
      buildFlowSnapshot({ devCredentials, entryState, onboardingEnabled }),
    );
    return constructAuthUrl({
      provider,
      clientId,
      redirectUri,
      // Fallback when there's no snapshot: come back to a plain login.
      entryState: UiStates.EMAIL_INPUT,
      expirationDate: urlParams.get('expirationDate'),
      permissionTemplateId: urlParams.get('permissionTemplateId'),
      permissions: urlParams.get('permissions'),
      utm: urlParams.getAll('utm'),
      vehicleMakes: urlParams.getAll('vehicleMakes'),
      vehicles: urlParams.getAll('vehicles'),
      powertrainTypes: urlParams.getAll('powertrainTypes'),
      // From state rather than the URL: popup mode receives it by postMessage.
      cloudEvent,
      onboarding: onboardingEnabled ? ['tesla'] : [], //TODO: Should have full onboarding array here
      altTitle,
      emailPermissionGranted,
      flowRef,
    });
  };
};
