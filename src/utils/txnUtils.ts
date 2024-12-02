import { isStandalone } from "./isStandalone";
import { sendMessageToReferrer } from "./messageHandler";

export function sendTxnResponseToParent(
  transactionHash: string,
  redirectUri: string,
  onSuccess: (transactionHash: string) => void
) {
  if (isStandalone()) {
    //Do a redirect here
    window.location.href = `${redirectUri}?transactionHash=${transactionHash}`;
    onSuccess(transactionHash);
    return;
  }

  sendMessageToReferrer({
    eventType: "transactionResponse",
    transactionHash,
  });

  onSuccess(transactionHash);

  // Trigger success callback
}
