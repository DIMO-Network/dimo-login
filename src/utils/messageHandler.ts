import { isStandalone } from './isStandalone';
import { getAppUrl, getRedirectUriWithUtm } from './urlHelpers';

/**
 * Posts `data` to the window that opened (popup) or embeds (iframe) this page.
 *
 * Pass `registeredRedirectUri` for anything carrying the user's token, a
 * signature or a key: the message is then addressed to that URI's origin, so
 * the browser delivers it only when the opener/parent is the registered app.
 */
export function sendMessageToReferrer(data: object, registeredRedirectUri?: string) {
  if (isStandalone()) {
    console.warn('Not opened in popup or iframe, use url based creds');
    return;
  }

  let parentOrigin = getAppUrl().origin;
  // Passed at all (even empty) means the message is secret: it never falls
  // back to the referrer, which the opening page controls.
  if (registeredRedirectUri !== undefined) {
    let origin = 'null';
    try {
      origin = new URL(registeredRedirectUri).origin;
    } catch {
      // handled below
    }
    // Custom schemes (myapp://…) have no web origin to address; such apps use the redirect flow.
    if (origin === 'null') {
      console.error(
        'sendMessageToReferrer: redirectUri has no web origin — message suppressed',
      );
      return;
    }
    parentOrigin = origin;
  }

  const referrer = window.opener || window.parent;

  console.log('Referrer', referrer);
  console.log('Parent', parentOrigin);

  if (referrer) {
    referrer.postMessage(
      { ...data, mode: window.opener ? 'popup' : 'embed' },
      parentOrigin,
    );
    console.log('Message sent to developer app');
  } else {
    console.warn('No referrer found');
  }
}

// The SDK's redirect-mode nonce (dimoState), returned with every redirect back
// so the app can tell its own returns from a forged link. One flow per page.
let appState: string | undefined;
export const setAppState = (value: string | undefined) => {
  appState = value;
};

export function backToThirdParty(
  payload: Record<string, string | number | boolean | undefined | null>,
  redirectUri: string,
  utm: string,
  handleEmbed?: () => void,
) {
  if (isStandalone()) {
    // Redirect with payload in query params. Missing values are left out:
    // String(undefined) used to send `email=undefined` when email wasn't shared.
    const redirectUriWithUtm = getRedirectUriWithUtm(redirectUri, utm || '');
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      redirectUriWithUtm.searchParams.set(key, String(value));
    });
    if (appState) redirectUriWithUtm.searchParams.set('dimoState', appState);

    window.location.href = redirectUriWithUtm.toString();
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
