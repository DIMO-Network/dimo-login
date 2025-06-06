import { ValidationFunction } from '../hooks/useErrorHandler';
import { getParamFromUrlOrState } from '../utils/urlHelpers';

const validateTransactionData: ValidationFunction = ({ urlParams, decodedState }) => {
  const transactionData = getParamFromUrlOrState(
    'transactionData',
    urlParams,
    decodedState,
  );

  if (!transactionData) {
    return {
      isValid: false,
      error: {
        title: 'Missing Transaction Data',
        message: 'Missing transaction data, please check the configuration and reload.',
      },
    };
  }

  return { isValid: true };
};

export const advancedTransactionValidations = {
  validateTransactionData,
} satisfies Record<string, ValidationFunction>;
