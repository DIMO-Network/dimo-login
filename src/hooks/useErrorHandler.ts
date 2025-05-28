import {
  ErrorMessage as GlobalErrorMessage,
  getGlobalError,
} from '../validations/globalValidations';

type ValidationResult = {
  isValid: boolean;
  error?: GlobalErrorMessage;
};

export type ValidationFunction = (params: {
  urlParams: URLSearchParams;
  decodedState: Record<string, unknown>;
}) => ValidationResult;

type UseErrorHandlerProps = {
  clientId?: string;
  apiKey?: string;
  redirectUri?: string;
  invalidCredentials?: boolean;
  customValidations?: Record<string, ValidationFunction>;
  entryState?: string;
};

const getValidationError = (
  validations: Record<string, ValidationFunction>,
  params: { urlParams: URLSearchParams; decodedState: Record<string, unknown> },
): GlobalErrorMessage | undefined => {
  return Object.values(validations)
    .map((validation) => validation(params))
    .find((result) => !result.isValid)?.error;
};

export const useErrorHandler = ({
  clientId,
  apiKey,
  redirectUri,
  invalidCredentials,
  customValidations = {},
}: UseErrorHandlerProps): { error: GlobalErrorMessage | null } => {
  const globalError = getGlobalError({
    missingClientId: !clientId,
    missingRedirectUri: !redirectUri,
    invalidCredentials: Boolean(invalidCredentials),
    missingCredentials: !clientId || !apiKey || !redirectUri,
  } as const);

  if (globalError) {
    return { error: globalError };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get('state');
  const decodedState = state ? JSON.parse(decodeURIComponent(state)) : {};
  const validationError = getValidationError(customValidations, {
    urlParams,
    decodedState,
  });

  return {
    error: validationError || null,
  };
};
