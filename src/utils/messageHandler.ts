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

/**
 * Where a redirect back puts the session (SDK `responseMode`): the query (the
 * default), or the fragment, which isn't sent to the app's server.
 */
export type ResponseMode = 'query' | 'fragment';

/** `query` or `fragment`, exactly; anything else is dropped. */
export const normalizeResponseMode = (value: unknown): ResponseMode | undefined =>
  value === 'query' || value === 'fragment' ? value : undefined;

let responseMode: ResponseMode = 'query';
export const setResponseMode = (value: ResponseMode) => {
  responseMode = value;
};

// What the SDK reads from a redirect back. In fragment mode these, and
// dimoState, go in the fragment; what the app reads itself (error,
// transactionHash, sharedVehicles…) stays in the query.
const SESSION_KEYS = new Set(['token', 'walletAddress', 'email', 'logout']);

export function backToThirdParty(
  payload: Record<string, string | number | boolean | undefined | null>,
  redirectUri: string,
  utm: string,
  handleEmbed?: () => void,
) {
  if (isStandalone()) {
    // Redirect with the payload in the query (or the session in the fragment).
    // Missing values are left out: String(undefined) used to send
    // `email=undefined` when email wasn't shared.
    const redirectUriWithUtm = getRedirectUriWithUtm(redirectUri, utm || '');
    // The app's own fragment (a hash route) can't carry ours as well.
    const useFragment = responseMode === 'fragment' && !redirectUri.includes('#');
    if (responseMode === 'fragment' && !useFragment) {
      console.warn(
        'responseMode=fragment needs a redirect URI without a #: answering in the query',
      );
    }
    const fragment = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const target =
        useFragment && SESSION_KEYS.has(key) ? fragment : redirectUriWithUtm.searchParams;
      target.set(key, String(value));
    });
    // URLSearchParams.size is too recent for every browser the login supports.
    const hasFragment = fragment.toString() !== '';
    if (appState) {
      // With the session it belongs to; an error alone keeps it in the query.
      (hasFragment ? fragment : redirectUriWithUtm.searchParams).set(
        'dimoState',
        appState,
      );
    }
    if (hasFragment) redirectUriWithUtm.hash = fragment.toString();

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
