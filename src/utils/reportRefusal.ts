import { captureMessage, withScope } from '@sentry/react';

/** Why the login stopped a sign-in before it started or finished. */
export type RefusalReason =
  | 'untrusted_caller'
  | 'untrusted_oauth_return'
  | 'storage_blocked';

const refererOrigin = (referer?: string): string | undefined => {
  try {
    return referer ? new URL(referer).origin : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Reports a refusal to Sentry as a 'login.refused' warning, one issue per
 * reason, tagged with the app it hit. Otherwise it only reaches the user's
 * console. Tags hold ids and origins. The page URL loses its query and the
 * breadcrumbs are dropped, because an OAuth return's URL carries an
 * unexchanged code.
 */
export const reportRefusal = (
  reason: RefusalReason,
  tags: Record<string, string | null | undefined> = {},
): void => {
  withScope((scope) => {
    scope.setLevel('warning');
    scope.setFingerprint(['login.refused', reason]);
    scope.setTag('reason', reason);
    Object.entries(tags).forEach(([key, value]) => {
      if (value) scope.setTag(key, value);
    });
    scope.addEventProcessor((event) => {
      if (event.request) {
        const { url, headers = {} } = event.request;
        const referer = refererOrigin(headers.Referer);
        event.request = {
          url: url?.split(/[?#]/)[0],
          headers: {
            ...(headers['User-Agent'] && { 'User-Agent': headers['User-Agent'] }),
            ...(referer && { Referer: referer }),
          },
        };
      }
      delete event.breadcrumbs;
      return event;
    });
    captureMessage('login.refused');
  });
};
