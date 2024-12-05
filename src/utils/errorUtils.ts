import { isStandalone } from "./isStandalone";
import { sendMessageToReferrer } from "./messageHandler";

export function sendErrorToParent(error: Error | string, redirectUri: string, setUiState: (step: string) => void) {

  //Notifies the developer of a rejected transaction, through redirecting, or sending a message, closing the popup or navigating to the transaction cancelled screen
  const errorMessage = typeof error === "string" ? error : error.message;

  if (isStandalone()) {
    // Serialize and redirect with error details
    window.location.href = `${redirectUri}?error=${errorMessage}`;
    return;
  }

  // Send error details to parent via postMessage
  sendMessageToReferrer({eventType:"DIMO_ERROR", message: errorMessage});

  if (window.opener) {
    //Close popup window after auth
    window.close();
  }  

  // Trigger error callback
  setUiState("TRANSACTION_CANCELLED");
}
