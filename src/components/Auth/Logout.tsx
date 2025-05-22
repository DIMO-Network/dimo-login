import React, { useEffect } from 'react';

import { useUIManager } from '../../context/UIManagerContext';
import { ConnectedLoader } from '../Shared';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { logout } from '../../utils/authUtils';

export const Logout = () => {
  const { setLoadingState, setUiState } = useUIManager();
  const { clientId, redirectUri, utm } = useDevCredentials();

  useEffect(() => {
    setLoadingState(true, 'Logging out...');

    if (clientId && redirectUri) {
      logout(clientId, redirectUri, utm, setUiState);
    }
  }, [setLoadingState, clientId, redirectUri, utm, setUiState]);

  return (
    <>
      <ConnectedLoader />
    </>
  );
};

export default Logout;
