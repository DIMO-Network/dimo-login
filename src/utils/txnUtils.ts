import { HEADERS } from "../enums";
import { sendMessageToReferrer } from "./messageHandler";

export const sendTxnResponseToParent = (
  transactionHash: string,
  token: string,
  onSuccess: (transactionHash: string) => void
) => {
  //This simply sends the transaction response to the developer
  //We don't deal with closing the popup or redirecting, as that's handled by the SuccessfulTransaction screen
  sendMessageToReferrer({
    eventType: "transactionResponse",
    token,
    transactionHash,
  });

  onSuccess(transactionHash);
};

export const getSignInTitle = (
  alias: string,
  { altTitle = false }: { altTitle?: boolean } = {}
) => {
  const titleBaseText = altTitle ? HEADERS.ALT : HEADERS.DEFAULT;
  return titleBaseText.replace("%s", alias);
};
