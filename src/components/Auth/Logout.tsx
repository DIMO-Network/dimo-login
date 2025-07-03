import React, { useEffect } from 'react';

import { useUIManager } from '../../context/UIManagerContext';
import { UIManagerLoader } from '../Shared';
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
      <UIManagerLoader />
    </>
  );
};

export default Logout;
