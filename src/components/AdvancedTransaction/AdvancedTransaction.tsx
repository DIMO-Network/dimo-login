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

const AdvancedTransaction: React.FC = () => {
  //TODO
  //Loading and Error Handling should not be determined by AuthContext
  //Transaction Params should not be handled by dev credentials
  const { clientId, redirectUri, setUiState, transactionData, setComponentData } =
    useDevCredentials();
  const { user, setLoading, setError, error } = useAuthContext();

  if (!transactionData) {
    return (
      <ErrorScreen
        title="Missing Transaction Data"
        message="Please check the configuration and reload the page."
      />
    );
  }

  const onApprove = async () => {
    setLoading("Executing Transaction");
    //Ensure Passkey

    //TODO: Switch to Kernel Signer
    if (user && user.subOrganizationId && user.walletAddress) {
      await initializeIfNeeded(user.subOrganizationId);
    }

    try {
      const receipt = await executeAdvancedTransaction(
        transactionData.address,
        transactionData.value,
        transactionData.abi,
        transactionData.functionName,
        transactionData.args
      );

      sendTxnResponseToParent(receipt, redirectUri!, (transactionHash) => {
        setComponentData({transactionHash});
        setUiState("TRANSACTION_SUCCESS");
        setLoading(false);
      });
    } catch (e) {
      console.log(e);

      sendErrorToParent(
        `Could not execute transaction ${JSON.stringify(e)}`,
        redirectUri!
      );
      setError("Could not execute transaction, please try again");
      setLoading(false);
    }
  };

  const onReject = async () => {
    //TBD
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
              trust the developer.{" "}
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
            <p className="text-gray-600">VALUE:</p>
            <p className="text-gray-600">{transactionData?.value.toString()}</p>
          </div>

          {/* Render buttons */}
          <div className={`flex justify-between w-full pt-4`}>
            <button
              onClick={onReject}
              className="bg-white w-[214px] text-[#09090B] border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500"
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
