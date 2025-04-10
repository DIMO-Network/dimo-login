import { HEADERS } from '../enums';
import { KeyboardEvent } from 'react';

export const getSignInTitle = (
  alias: string,
  { altTitle = false }: { altTitle?: boolean } = {},
) => {
  const titleBaseText = altTitle ? HEADERS.ALT : HEADERS.DEFAULT;
  return titleBaseText.replace('%s', alias);
};

export const getKeyboardEventListener =
  (keyType: string, callback: () => void) => (e: KeyboardEvent<unknown>) => {
    if (e.key === keyType) {
      callback();
    }
  };
