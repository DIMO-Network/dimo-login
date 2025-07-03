import React from 'react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { executeAdvancedTransaction } from '../../services/turnkeyService';
import { sendTxnResponseToParent } from '../../utils/txnUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { ErrorMessage, Header, PrimaryButton, UIManagerLoaderWrapper } from '../Shared';

export const AdvancedTransaction: React.FC = () => {
  const { redirectUri, utm, transactionData } = useDevCredentials();
  const { setUiState, setComponentData, setLoadingState, error, setError } =
    useUIManager();
  const { jwt, validateSession } = useAuthContext();

  const onApprove = async () => {
    setLoadingState(true, 'Executing Transaction', true);
    try {
      const validSession = await validateSession();
      if (!validSession) {
        setLoadingState(false);
        return;
      }
      const receipt = await executeAdvancedTransaction(
        transactionData!.abi,
        transactionData!.functionName,
        transactionData!.args,
        transactionData!.value,
      );

      //Send transaction hash to developer, and show user successful txn
      sendTxnResponseToParent(receipt, jwt!, (transactionHash) => {
        setComponentData({ transactionHash });
        setUiState(UiStates.TRANSACTION_SUCCESS);
        setLoadingState(false);
      });
    } catch (e) {
      console.log(e);
      setError('Could not execute transaction, please try again');
    } finally {
      setLoadingState(false);
    }
  };

  const onReject = async () => {
    //This will send the message, and close the winodw
    //Doesn't currently handle redirecting
    sendErrorToParent(`User Rejected the Transaction`, redirectUri, utm, setUiState);
  };

  return (
    <UIManagerLoaderWrapper>
      <Header title="Advanced Transaction" subtitle="" />
      {error && <ErrorMessage message={error} />}
      <div className="flex flex-col gap-[12px] text-sm">
        <p>Warning:</p>
        <p>
          {window.location.hostname} is requesting that you sign a non-standard
          transaction. Only complete this transaction if you trust the developer.
        </p>
      </div>

      <div className="flex flex-col w-full gap-[8px] rounded-md text-sm">
        <p className="text-gray-600">FUNCTION TYPE: {transactionData?.functionName}</p>
        <p className="text-gray-600">PARAMETERS:</p>
        <ul className="list-disc pl-5 text-gray-600">
          {transactionData?.args.map((arg, idx) => <li key={idx}>{arg.toString()}</li>)}
        </ul>
      </div>

      <div className="flex flex-col w-full gap-[8px] rounded-md text-sm">
        <p className="text-gray-600">ADDRESS:</p>
        <p className="text-gray-600">{transactionData!.address}</p>

        {transactionData!.value && (
          <>
            <p className="text-gray-600">VALUE:</p>
            <p className="text-gray-600">{transactionData!.value?.toString()}</p>
          </>
        )}
      </div>

      {/* Render buttons */}
      <div className={`flex justify-between w-full pt-4`}>
        <button
          onClick={onReject}
          className="bg-white w-[214px] font-medium text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
        >
          Reject
        </button>
        <PrimaryButton onClick={onApprove} width="w-[214px]">
          Approve
        </PrimaryButton>
      </div>
    </UIManagerLoaderWrapper>
  );
};

export default AdvancedTransaction;
