import { HEADERS } from "../enums";

export const getSignInTitle = (
    alias: string,
    { altTitle = false }: { altTitle?: boolean } = {}
  ) => {
    const titleBaseText = altTitle ? HEADERS.ALT : HEADERS.DEFAULT;
    return titleBaseText.replace("%s", alias);
  };