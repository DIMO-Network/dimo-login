export const isEmbed = () => {
  return !window.opener && window !== window.top;
};

/**
 * The origin of the page this one is embedded in, or null when the browser
 * doesn't say (Firefox has no ancestorOrigins; a no-referrer parent hides it).
 */
export const getEmbedderOrigin = (): string | null => {
  const parent = window.location.ancestorOrigins?.[0];
  if (parent) return parent === 'null' ? null : parent;
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch {
    return null;
  }
};
