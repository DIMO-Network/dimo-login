export function sendMessageToReferrer(data: object) {
  if (!document.referrer) {
    console.warn("Not opened in popup or iframe, use url based creds");
    return;
  }
  const parentOrigin = new URL(document.referrer).origin;
  const referrer = window.opener || window.parent;

  if (referrer) {
    referrer.postMessage(data, parentOrigin);
    console.log("Message sent to developer app");
  } else {
    console.warn("No referrer found");
  }
}
