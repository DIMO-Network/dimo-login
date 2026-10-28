import { ValidationFunction } from '../hooks/useErrorHandler';
import { message as translated } from '../i18n';

const HEX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

const validateMessageData: ValidationFunction = ({ messageData }) => {
  if (!messageData || typeof messageData !== 'object') {
    return {
      isValid: false,
      error: {
        title: translated('error.missing_message_data.title'),
        message: translated('error.missing_message_data.message'),
      },
    };
  }

  const { message, isHex } = messageData;

  if (typeof message !== 'string' || message.length === 0) {
    return {
      isValid: false,
      error: {
        title: translated('error.invalid_message.title'),
        message: translated('error.invalid_message.message'),
      },
    };
  }

  if (isHex && !HEX_HASH_RE.test(message)) {
    return {
      isValid: false,
      error: {
        title: translated('error.invalid_hash.title'),
        message: translated('error.invalid_hash.message'),
      },
    };
  }

  return { isValid: true };
};

export const signMessageValidations = {
  validateMessageData,
} satisfies Record<string, ValidationFunction>;
