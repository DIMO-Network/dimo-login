import { Header, LegalNotice, PrimaryButton, SecondaryButton } from '../Shared';
import { getSignInTitle } from '../../utils/uiUtils';
import React from 'react';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { UiStates, useUIManager } from '../../context/UIManagerContext';
import { getAppUrl } from '../../utils/urlHelpers';
import { clearLoggedEmail } from '../../services';

export const PasskeyLoginFail = ({ email }: { email: string }) => {
  const { devLicenseAlias, clientId } = useDevCredentials();
  const { altTitle, setUiState, setError } = useUIManager();
  const appUrl = getAppUrl();

  return (
    <>
      <Header
        title={getSignInTitle(devLicenseAlias, {
          altTitle: Boolean(altTitle),
        })}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      <p className="text-sm text-center my-3.5">Login with {email}</p>
      <div className={'flex flex-col gap-3 mb-3.5'}>
        <PrimaryButton
          onClick={() => {
            setError(null);
            setUiState(UiStates.PASSKEY_LOGIN);
          }}
          width="w-full lg:w-[440px]"
        >
          Retry passkey
        </PrimaryButton>
        <SecondaryButton
          onClick={() => {
            setError(null);
            setUiState(UiStates.OTP_INPUT);
          }}
          width="w-full lg:w-[440px]"
          className="rounded-full border border-gray-300 px-4 py-2"
        >
          Login with email code
        </SecondaryButton>
        <SecondaryButton
          onClick={() => {
            setError(null);
            clearLoggedEmail(clientId);
            setUiState(UiStates.EMAIL_INPUT);
          }}
          width="w-full lg:w-[440px]"
          className="rounded-full px-4 py-2"
        >
          Login to a different account
        </SecondaryButton>
      </div>
      <LegalNotice />
    </>
  );
};
