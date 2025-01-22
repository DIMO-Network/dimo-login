export const getParamFromUrlOrState = (
  key: string,
  urlParams: URLSearchParams,
  decodedState: Record<string, any>
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
  const state = urlParams.get("state");

  try {
    const referrer = state
      ? JSON.parse(decodeURIComponent(state))?.referrer
      : document.referrer;

    return new URL(referrer || "https://dimo.org");
  } catch (error) {
    console.error("Failed to parse appUrl state:", error);
    return new URL("https://dimo.org");
  }
};

export const getRedirectUriWithUtm = (redirectUri: string, utm: string) => {
  const url = new URL(redirectUri);
  const utmParams = new URLSearchParams(utm);
  utmParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url;
};

export const getBaseURI = (uri: string) => {
  const redirectUrl = new URL(uri);
  return `${redirectUrl.origin}${redirectUrl.pathname}`;
};
