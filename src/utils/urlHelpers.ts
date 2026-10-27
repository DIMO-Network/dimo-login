import { readTrustedOAuthReturn } from './flowSnapshot';

/**
 * The page that opened or embeds this one, for messages that carry nothing
 * secret (READY, data requests, errors). After an OAuth round-trip the
 * referrer is the provider, so the one saved in a trusted `state` is used.
 */
export const getAppUrl = () => {
  const trustedReturn = readTrustedOAuthReturn();
  const referrer = trustedReturn ? trustedReturn.state.referrer : document.referrer;
  try {
    return new URL(
      typeof referrer === 'string' && referrer ? referrer : 'https://dimo.org',
    );
  } catch (error) {
    return new URL('https://dimo.org');
  }
};

/** The origin of a URL, or null for a malformed one or a custom scheme. */
export const originOf = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const { origin } = new URL(url);
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
};

/**
 * Where the request comes from, for the origin chip: the host of the redirect
 * URI the license registered (validated before any screen shows), not the
 * referrer, which the page that opened the popup controls.
 */
export const getRedirectHost = (redirectUri?: string | null): string => {
  if (!redirectUri) return '';
  try {
    const url = new URL(redirectUri);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.host;
    // An app scheme (myapp://callback) has no web host; show the scheme.
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
};

export const getRedirectUriWithUtm = (redirectUri: string, utm: string) => {
  try {
    const url = new URL(redirectUri);

    // Ensure UTM is a valid query string or key-value pair
    if (utm.includes('=')) {
      const utmParams = new URLSearchParams(utm);
      utmParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    } else if (utm.trim()) {
      // If `utm` is a single value, append it as `utm` parameter
      url.searchParams.set('utm', utm);
    }

    return url;
  } catch (e) {
    return new URL(redirectUri);
  }
};
