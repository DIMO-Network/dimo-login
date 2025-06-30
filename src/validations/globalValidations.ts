export type ErrorMessage = {
  title: string;
  message: string;
};

export const GLOBAL_ERROR_MESSAGES = {
  missingClientId: {
    title: 'Missing Client ID',
    message:
      "Missing client ID from the app, please check with the application developer that you're attempting to access.",
  },
  missingRedirectUri: {
    title: 'Missing Redirect URI',
    message:
      'Missing redirect URI from the app, please check with <license_alias> to setup a valid redirect URI.',
  },
  invalidCredentials: {
    title: 'Invalid App Credentials',
    message:
      "We're sorry, but it looks like there's an issue with the app's credentials. This may be due to an invalid setup or unregistered access. Please reach out to the app's support team for assistance.",
  },
} as const;

type ErrorKey = keyof typeof GLOBAL_ERROR_MESSAGES;

export const getGlobalError = (
  errorTypes: Record<ErrorKey, boolean>,
): ErrorMessage | undefined => {
  const errorKey = Object.entries(errorTypes).find(([_, hasError]) => hasError)?.[0] as
    | ErrorKey
    | undefined;

  return errorKey ? GLOBAL_ERROR_MESSAGES[errorKey] : undefined;
};
