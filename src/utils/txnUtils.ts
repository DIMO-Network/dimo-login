import { sendMessageToReferrer } from './messageHandler';

export function sendTxnResponseToParent(
  transactionHash: string,
  token: string,
  onSuccess: (transactionHash: string) => void,
) {
  //This simply sends the transaction response to the developer
  //We don't deal with closing the popup or redirecting, as that's handled by the SuccessfulTransaction screen
  sendMessageToReferrer({
    eventType: 'transactionResponse',
    token,
    transactionHash,
  });

  onSuccess(transactionHash);
}

export function sendSignatureResponseToParent(
  signature: `0x${string}`,
  signer: `0x${string}`,
  token: string,
  onSuccess: (signature: `0x${string}`) => void,
) {
  sendMessageToReferrer({
    eventType: 'messageResponse',
    token,
    signature,
    signer,
  });

  onSuccess(signature);
}
