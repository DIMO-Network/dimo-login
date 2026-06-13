import React from 'react';
import { captureException } from '@sentry/react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { Header, ErrorMessage, PrimaryButton, UIManagerLoaderWrapper } from '../Shared';
import { useShareAccounts } from '../../hooks/useShareAccounts';
import { useFinishShareAccounts } from '../../hooks/useFinishShareAccounts';
import { isInvalidSessionError } from '../../utils/authUtils';
import { getAppUrl } from '../../utils/urlHelpers';
import { AccountManagerMandatoryParams } from '../../types';

// Account-level consent screen — the no-vehicle-list sibling of VehicleManager.
// Renders the documents the renter is about to share (driver's license +
// insurance card) and an Allow/Cancel footer that signs the account SACD.
export const AccountManager: React.FC = () => {
  const { devLicenseAlias } = useDevCredentials<AccountManagerMandatoryParams>();
  const { setLoadingState, setError, error } = useUIManager();
  const shareAccounts = useShareAccounts();
  const finishShareAccounts = useFinishShareAccounts();

  const appUrl = getAppUrl();
  const brand = devLicenseAlias || 'the application developer';

  const documents = ["Driver's license", 'Insurance card'];

  const handleShare = async () => {
    try {
      setLoadingState(true, 'Sharing documents', true);
      await shareAccounts();
      finishShareAccounts();
    } catch (err) {
      captureException(err);
      if (!isInvalidSessionError(err)) {
        setError('Failed to share documents');
      }
    } finally {
      setLoadingState(false);
    }
  };

  const onCancel = () => {
    finishShareAccounts();
  };

  return (
    <>
      <Header
        title={`${brand} wants to use DIMO to access your documents`}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      <div className="flex flex-col items-center justify-center max-h-[480px] lg:max-h-[584px] box-border overflow-y-auto w-full">
        {error && <ErrorMessage message={error} />}

        <UIManagerLoaderWrapper>
          <div className="w-full mt-2 text-sm font-normal text-[#313131]">
            <p className="mb-4">
              {brand} will be able to view these documents until you revoke
              access:
            </p>
            <ul className="list-disc list-inside mb-4">
              {documents.map((doc) => (
                <li key={doc} className="ml-4">
                  {doc}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-flow-col auto-cols-fr gap-4 justify-between w-full max-w-[440px] pt-4">
            <button
              onClick={onCancel}
              className="bg-white font-medium text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleShare}>Allow</PrimaryButton>
          </div>
        </UIManagerLoaderWrapper>
      </div>
    </>
  );
};

export default AccountManager;
