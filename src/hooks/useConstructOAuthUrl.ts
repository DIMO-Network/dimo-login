import { useDevCredentials } from '../context/DevCredentialsContext';
import { useOracles } from '../context/OraclesContext';
import { useUIManager } from '../context/UIManagerContext';
import { AuthProvider, constructAuthUrl } from '../utils/authUrls';
import { buildFlowSnapshot, saveFlowSnapshot } from '../utils/flowSnapshot';

/**
 * The Google/Apple sign-in URL, or null when the flow can't be saved for the
 * return (storage blocked): such a return couldn't be told from a forged one.
 */
export const useConstructOAuthUrl = () => {
  const devCredentials = useDevCredentials();
  const { onboardingEnabled } = useOracles();
  const { entryState } = useUIManager();

  return (provider: AuthProvider): string | null => {
    // The flow (share vehicles, documents, a transaction…) is restored from
    // this snapshot on return.
    const flowRef = saveFlowSnapshot(
      buildFlowSnapshot({ devCredentials, entryState, onboardingEnabled }),
    );
    return flowRef ? constructAuthUrl({ provider, flowRef }) : null;
  };
};
