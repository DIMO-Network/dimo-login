import { UiStates } from '@context/UIManagerContext';
import { backToThirdParty, sendMessageToReferrer } from './messageHandler';

export function sendErrorToParent(
  error: Error | string,
  redirectUri: string,
  setUiState: (step: UiStates) => void
) {
  //Notifies the developer of a rejected transaction, through redirecting, or sending a message, closing the popup or navigating to the transaction cancelled screen
  const errorMessage = typeof error === 'string' ? error : error.message;
  sendMessageToReferrer({ eventType: 'DIMO_ERROR', message: errorMessage });

  const payload = { error: errorMessage };

  backToThirdParty(payload, redirectUri, () => {
    setUiState(UiStates.TRANSACTION_CANCELLED); //For Embed
  });
}
