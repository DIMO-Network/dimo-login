import { HEADERS } from "../enums";

interface IOptions {
  useAltTitle?: boolean;
}

export const getSignInTitle = (
  alias: string,
  { useAltTitle = false }: IOptions = {}
) => {
  const titleBaseText = useAltTitle ? HEADERS.ALT : HEADERS.DEFAULT;
  return titleBaseText.replace("%s", alias);
};
