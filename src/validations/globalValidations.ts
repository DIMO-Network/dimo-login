import { message, type Message } from '../i18n';

export type ErrorMessage = {
  title: Message;
  message: Message;
};

// Messages may name the app as {{appName}}; ErrorScreen fills it in.
export const GLOBAL_ERROR_MESSAGES = {
  untrustedOAuthReturn: {
    title: message('error.untrusted_return.title'),
    message: message('error.untrusted_return.message'),
  },
  untrustedCaller: {
    title: message('error.untrusted_caller.title'),
    message: message('error.untrusted_caller.message'),
  },
  missingClientId: {
    title: message('error.missing_client_id.title'),
    message: message('error.missing_client_id.message'),
  },
  missingRedirectUri: {
    title: message('error.missing_redirect_uri.title'),
    message: message('error.missing_redirect_uri.message'),
  },
  invalidCredentials: {
    title: message('error.invalid_credentials.title'),
    message: message('error.invalid_credentials.message'),
  },
} as const satisfies Record<string, ErrorMessage>;

type ErrorKey = keyof typeof GLOBAL_ERROR_MESSAGES;

export const getGlobalError = (
  errorTypes: Record<ErrorKey, boolean>,
): ErrorMessage | undefined => {
  const errorKey = Object.entries(errorTypes).find(([_, hasError]) => hasError)?.[0] as
    ErrorKey | undefined;

  return errorKey ? GLOBAL_ERROR_MESSAGES[errorKey] : undefined;
};
