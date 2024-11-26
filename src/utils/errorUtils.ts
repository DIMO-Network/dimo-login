import { isStandalone } from "./isStandalone";

export function sendErrorToParent(
    error: Error | string,
    redirectUri: string,
  ) {
    const errorDetails = {
      eventType: "DIMO_ERROR",
      message: typeof error === "string" ? error : error.message,
    };
  
    if (isStandalone()) {
      // Serialize and redirect with error details
      const serializedError = encodeURIComponent(JSON.stringify(errorDetails));
      window.location.href = `${redirectUri}?error=${serializedError}`;
      return;
    }
  
    // Send error details to parent via postMessage
    const parentOrigin = new URL(document.referrer).origin;
    if (window.opener) {
      window.opener.postMessage(errorDetails, parentOrigin);
    } else if (window.parent) {
      window.parent.postMessage(errorDetails, parentOrigin);
    }
  
    // Trigger error callback
  }
  