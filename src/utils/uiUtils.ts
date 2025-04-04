import { HEADERS } from "../enums";

interface IOptions {
  altTitle?: boolean;
}

export const getSignInTitle = (
  alias: string,
  options?: IOptions
) => {
  const titleBaseText = options?.altTitle ? HEADERS.ALT : HEADERS.DEFAULT;
  return titleBaseText.replace("%s", alias);
};
