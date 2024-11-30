import { isStandalone } from "./isStandalone";
import { sendMessageToReferrer } from "./messageHandler";

export function sendErrorToParent(error: Error | string, redirectUri: string) {

  const errorMessage = typeof error === "string" ? error : error.message;

  if (isStandalone()) {
    // Serialize and redirect with error details
    window.location.href = `${redirectUri}?error=${errorMessage}`;
    return;
  }

  // Send error details to parent via postMessage
  sendMessageToReferrer({eventType:"DIMO_ERROR", message: errorMessage});

  // Trigger error callback
}
