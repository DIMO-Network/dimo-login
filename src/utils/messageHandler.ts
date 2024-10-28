export function sendMessageToReferrer(data: object) {
  const parentOrigin = new URL(document.referrer).origin; //TODO: Error Handling
  const referrer = window.opener || window.parent;

  if (referrer) {
    referrer.postMessage(data, parentOrigin);
  } else {
    console.warn("No referrer found");
  } 
}
