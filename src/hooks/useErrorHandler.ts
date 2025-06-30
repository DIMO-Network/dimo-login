import { AllParams } from '../types';
import {
  ErrorMessage as GlobalErrorMessage,
  getGlobalError,
} from '../validations/globalValidations';

type ValidationResult = {
  isValid: boolean;
  error?: GlobalErrorMessage;
};

export type ValidationFunction = (params: AllParams) => ValidationResult;

type UseErrorHandlerProps = {
  customValidations?: Record<string, ValidationFunction>;
  params: AllParams;
};

const getValidationError = (
  validations: Record<string, ValidationFunction>,
  params: AllParams,
): GlobalErrorMessage | undefined => {
  return Object.values(validations)
    .map((validation) => validation(params))
    .find((result) => !result.isValid)?.error;
};

export const useErrorHandler = ({
  customValidations = {},
  params,
}: UseErrorHandlerProps): { error: GlobalErrorMessage | null } => {
  const globalError = getGlobalError({
    missingClientId: !Boolean(params.clientId),
    missingRedirectUri: !Boolean(params.redirectUri),
    invalidCredentials: Boolean(params.invalidCredentials),
  } as const);

  if (globalError) {
    return { error: globalError };
  }
  const validationError = getValidationError(customValidations, params);

  return {
    error: validationError || null,
  };
};
