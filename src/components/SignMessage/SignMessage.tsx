import React from 'react';
import { captureException } from '@sentry/react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { signArbitraryMessage } from '../../services/turnkeyService';
import { sendSignatureResponseToParent } from '../../utils/txnUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { UiStates } from '../../enums';
import { ErrorMessage, Header, PrimaryButton, UIManagerLoaderWrapper } from '../Shared';

const PREVIEW_LIMIT = 280;

export const SignMessage: React.FC = () => {
  const { redirectUri, utm, messageData } = useDevCredentials();
  const { setUiState, setComponentData, setLoadingState, error, setError } =
    useUIManager();
  const { jwt, validateSession } = useAuthContext();
  const [showFull, setShowFull] = React.useState(false);

  const message = messageData?.message ?? '';
  const isHex = Boolean(messageData?.isHex);
  const tooLong = message.length > PREVIEW_LIMIT;
  const preview = !showFull && tooLong ? `${message.slice(0, PREVIEW_LIMIT)}…` : message;

  const onApprove = async () => {
    setLoadingState(true, 'Signing Message', true);
    try {
      const validSession = await validateSession();
      if (!validSession) {
        setLoadingState(false);
        return;
      }

      const { signature, signer } = await signArbitraryMessage(message, isHex);

      sendSignatureResponseToParent(signature, signer, jwt!, () => {
        setComponentData({ signature, signer, flowKind: 'signature' });
        setUiState(UiStates.TRANSACTION_SUCCESS);
        setLoadingState(false);
      });
    } catch (e) {
      console.log(e);
      captureException(e);
      setError('Could not sign message, please try again');
    } finally {
      setLoadingState(false);
    }
  };

  const onReject = async () => {
    sendErrorToParent(
      'User Rejected the Signature Request',
      redirectUri,
      utm,
      setUiState,
    );
  };

  return (
    <UIManagerLoaderWrapper>
      <Header title="Sign Message" subtitle="" />
      {error && <ErrorMessage message={error} />}
      <div className="flex flex-col gap-[12px] text-sm">
        <p>Warning:</p>
        <p>
          {window.location.hostname} is requesting that you sign a message. The signature
          can be used to prove your identity to {window.location.hostname}. Only sign if
          you trust the developer.
        </p>
      </div>

      <div className="flex flex-col w-full gap-[8px] rounded-md text-sm">
        <p className="text-gray-600">{isHex ? 'HASH:' : 'MESSAGE:'}</p>
        <pre className="text-gray-700 whitespace-pre-wrap break-all bg-gray-50 border border-gray-200 rounded p-3 font-mono text-xs">
          {preview}
        </pre>
        {tooLong && (
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            className="text-xs text-blue-600 self-start"
          >
            {showFull ? 'Show less' : 'Show full message'}
          </button>
        )}
      </div>

      <div className="flex justify-between w-full pt-4">
        <button
          onClick={onReject}
          className="bg-white w-[214px] font-medium text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
        >
          Reject
        </button>
        <PrimaryButton onClick={onApprove} width="w-[214px]">
          Sign
        </PrimaryButton>
      </div>
    </UIManagerLoaderWrapper>
  );
};

export default SignMessage;
