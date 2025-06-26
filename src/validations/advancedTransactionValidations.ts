import { ValidationFunction } from '../hooks/useErrorHandler';

const validateTransactionData: ValidationFunction = ({ transactionData }) => {
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
