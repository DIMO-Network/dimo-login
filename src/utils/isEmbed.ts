export const isEmbed = () => {
  return !window.opener && window !== window.top;
};
