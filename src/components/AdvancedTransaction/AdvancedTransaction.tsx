import React, { useEffect, useState } from "react";

import Card from "../Shared/Card";
import PrimaryButton from "../Shared/PrimaryButton";
import Header from "../Shared/Header";
import ErrorMessage from "../Shared/ErrorMessage";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { useAuthContext } from "../../context/AuthContext";
import {
  executeAdvancedTransaction,
  initializeIfNeeded,
} from "../../services/turnkeyService";
import ErrorScreen from "../Shared/ErrorScreen";
import { sendTxnResponseToParent } from "../../utils/txnUtils";
import { sendErrorToParent } from "../../utils/errorUtils";
import { TransactionData } from "@dimo-network/transactions";
import { sendMessageToReferrer } from "../../utils/messageHandler";
import { UiStates, useUIManager } from "../../context/UIManagerContext";

const AdvancedTransaction: React.FC = () => {
  const { redirectUri } = useDevCredentials();
  const { setUiState, setComponentData, setLoadingState, error, setError } =
    useUIManager();
  const { user, jwt } = useAuthContext();

  const [transactionData, setTransactionData] = useState<
    TransactionData | undefined
  >();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const transactionDataFromUrl = urlParams.get("transactionData");

    if (transactionDataFromUrl != null) {
      try {
        const parsedTransactionData = JSON.parse(
          decodeURIComponent(transactionDataFromUrl)
        );

        setTransactionData(parsedTransactionData);
      } catch (error) {
        console.error("Failed to parse transactionData:", error);
      }
    } else {
      sendMessageToReferrer({ eventType: "EXECUTE_ADVANCED_TRANSACTION" }); //Requests Data from SDK

      const handleMessage = (event: MessageEvent) => {
        const { eventType, transactionData } = event.data;
        if (eventType === "EXECUTE_ADVANCED_TRANSACTION") {
          setTransactionData(transactionData);
        }
      };
      window.addEventListener("message", handleMessage);
    }
  }, []);

  if (!transactionData) {
    return (
      <ErrorScreen
        title="Missing Transaction Data"
        message="ABI not supported in URL. Please contact developer"
      />
    );
  }

  const onApprove = async () => {
    setLoadingState(true, "Executing Transaction");
    //Ensure Passkey

    await initializeIfNeeded(user.subOrganizationId);

    try {
      const receipt = await executeAdvancedTransaction(
        transactionData.address,
        transactionData.abi,
        transactionData.functionName,
        transactionData.args,
        transactionData.value
      );

      //Send transaction hash to developer, and show user successful txn
      sendTxnResponseToParent(receipt, jwt!, (transactionHash) => {
        setComponentData({ transactionHash });
        setUiState(UiStates.TRANSACTION_SUCCESS);
        setLoadingState(false);
      });
    } catch (e) {
      console.log(e);
      setError("Could not execute transaction, please try again");
      setLoadingState(false);
    }
  };

  const onReject = async () => {
    //This will send the message, and close the winodw
    //Doesn't currently handle redirecting
    sendErrorToParent(
      `User Rejected the Transaction`,
      redirectUri!,
      setUiState
    );
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-fit">
      <Header title="Advanced Transaction" subtitle="" />
      {error && <ErrorMessage message={error} />}
      <div className="flex justify-center">
        <div className="flex flex-col items-start max-w-[440px] gap-[15px] lg:gap-[32px]">
          <div className="flex flex-col gap-[12px] text-sm">
            <p>Warning:</p>
            <p>
              {window.location.hostname} is requesting that you sign a
              non-standard transaction. Only complete this transaction if you
              trust the developer.
            </p>
          </div>

          <div className="flex flex-col w-full gap-[8px] rounded-md text-sm">
            <p className="text-gray-600">
              FUNCTION TYPE: {transactionData?.functionName}
            </p>
            <p className="text-gray-600">PARAMETERS:</p>
            <ul className="list-disc pl-5 text-gray-600">
              {transactionData?.args.map((arg, idx) => (
                <li key={idx}>{arg.toString()}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col w-full gap-[8px] rounded-md text-sm">
            <p className="text-gray-600">ADDRESS:</p>
            <p className="text-gray-600">{transactionData?.address}</p>

            {transactionData.value && (
              <>
                <p className="text-gray-600">VALUE:</p>
                <p className="text-gray-600">
                  {transactionData?.value?.toString()}
                </p>
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
        </div>
      </div>
    </Card>
  );
};

export default AdvancedTransaction;
