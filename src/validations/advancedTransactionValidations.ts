import { ValidationFunction } from '../hooks/useErrorHandler';
import { message } from '../i18n';

const validateTransactionData: ValidationFunction = ({ transactionData }) => {
  if (!transactionData) {
    return {
      isValid: false,
      error: {
        title: message('error.missing_transaction_data.title'),
        message: message('error.missing_transaction_data.message'),
      },
    };
  }

  return { isValid: true };
};

export const advancedTransactionValidations = {
  validateTransactionData,
} satisfies Record<string, ValidationFunction>;
