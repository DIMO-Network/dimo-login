import { getParamFromUrlOrState } from '../utils/urlHelpers';
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
  invalidCredentials,
  customValidations = {},
}: UseErrorHandlerProps): { error: GlobalErrorMessage | null } => {
  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get('state');
  const decodedState = state ? JSON.parse(decodeURIComponent(state)) : {};

  const clientId = getParamFromUrlOrState('clientId', urlParams, decodedState);
  const redirectUri = getParamFromUrlOrState('redirectUri', urlParams, decodedState);

  const globalError = getGlobalError({
    missingClientId: !clientId,
    missingRedirectUri: !redirectUri,
    invalidCredentials: Boolean(invalidCredentials),
    missingCredentials: !clientId || !redirectUri,
  } as const);

  if (globalError) {
    return { error: globalError };
  }
  const validationError = getValidationError(customValidations, {
    urlParams,
    decodedState,
  });

  return {
    error: validationError || null,
  };
};
