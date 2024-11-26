import { isStandalone } from "./isStandalone";

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
  const parentOrigin = new URL(document.referrer).origin;
  const message = {
    eventType: "transactionResponse",
    transactionHash,
  };
  if (window.opener) {
    window.opener.postMessage(message, parentOrigin);
  } else if (window.parent) {
    window.parent.postMessage(message, parentOrigin);
  }

  onSuccess(transactionHash);

  // Trigger success callback
}
