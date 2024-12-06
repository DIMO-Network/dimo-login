import { isStandalone } from "./isStandalone";

export function sendMessageToReferrer(data: object) {
  if (isStandalone()) {
    console.warn("Not opened in popup or iframe, use url based creds");
    return;
  }
  const parentOrigin = new URL(document.referrer).origin;
  const referrer = window.opener || window.parent;

  if (referrer) {
    referrer.postMessage({...data, mode: window.opener ? "popup" : "embed" }, parentOrigin);
    console.log("Message sent to developer app");
  } else {
    console.warn("No referrer found");
  }
}


export function backToThirdParty(payload: any, redirectUri: string) {
  if (isStandalone()) {
    // Redirect with payload in query params
    const queryParams = new URLSearchParams(payload).toString();
    window.location.href = `${redirectUri}?${queryParams}`;
    return;
  }

  if (window.opener) {
    // Close popup window
    window.close();
    return;
  }

  // Embedded mode: Button won't show
  console.warn("Embedded mode detected. Back to third-party action skipped.");
}
