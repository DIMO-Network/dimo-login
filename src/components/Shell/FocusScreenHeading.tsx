import { useEffect, useRef, type RefObject } from 'react';

/**
 * Focuses the screen's heading, so a new step announces itself.
 *
 * App renders it after the screen, inside the screen's Suspense boundary and
 * keyed by uiState, so it mounts only once the new screen has committed. A
 * lazy screen shows the loading screen first; an effect on uiState alone would
 * run then, before the new heading exists.
 *
 * The first screen leaves focus where the page put it. `firstScreen` holds the
 * instance that mounted first, which StrictMode's second effect run keeps.
 */
export const FocusScreenHeading = ({
  firstScreen,
}: {
  firstScreen: RefObject<object | null>;
}) => {
  const instance = useRef({});

  useEffect(() => {
    firstScreen.current ??= instance.current;
    if (firstScreen.current === instance.current) return;
    document
      .querySelector<HTMLElement>('main [data-screen-heading]')
      ?.focus({ preventScroll: true });
  }, [firstScreen]);

  return null;
};
