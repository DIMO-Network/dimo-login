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
