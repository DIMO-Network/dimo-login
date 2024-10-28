export const isStandalone = () => {
  const isTopLevel = window === window.top; // Checks if the page is in the top-level context (not an iframe)
  const hasNoOpener = !window.opener; // Checks if the page wasn't opened by another window (not a popup)
  return isTopLevel && hasNoOpener;
};
