import { isStandalone } from './isStandalone';
import { getAppUrl } from './urlHelpers';

export function sendMessageToReferrer(data: object) {
  if (isStandalone()) {
    console.warn('Not opened in popup or iframe, use url based creds');
    return;
  }

  const parentOrigin = getAppUrl().origin;

  const referrer = window.opener || window.parent;

  console.log('Referrer', referrer);
  console.log('Parent', parentOrigin);

  if (referrer) {
    referrer.postMessage(
      { ...data, mode: window.opener ? 'popup' : 'embed' },
      parentOrigin
    );
    console.log('Message sent to developer app');
  } else {
    console.warn('No referrer found');
  }
}

export function backToThirdParty(
  payload: any,
  redirectUri: string,
  handleEmbed?: () => void
) {
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

  // Embedded mode (Should be closed or redirected by now if non-embed)
  if (handleEmbed) {
    handleEmbed();
  } else {
    console.warn('Embedded mode detected. No action provided.');
  }
}
