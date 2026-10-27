export const getParamFromUrlOrState = (
  key: string,
  urlParams: URLSearchParams,
  decodedState: Record<string, any>,
): string | string[] | undefined => {
  // Handle array fields via `getAll()`
  const fromUrl = urlParams.getAll(key);
  const fromState = decodedState[key];

  // Return array if applicable
  if (fromUrl.length > 0) {
    return fromUrl.length === 1 ? fromUrl[0] : fromUrl;
  }

  // Handle state fallback (array or string)
  return fromState ?? undefined;
};

export const getAppUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get('state');

  try {
    const referrer = state
      ? JSON.parse(decodeURIComponent(state))?.referrer
      : document.referrer;

    return new URL(referrer || 'https://dimo.org');
  } catch (error) {
    return new URL('https://dimo.org');
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
