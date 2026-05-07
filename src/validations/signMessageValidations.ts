import { ValidationFunction } from '../hooks/useErrorHandler';

const HEX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

const validateMessageData: ValidationFunction = ({ messageData }) => {
  if (!messageData || typeof messageData !== 'object') {
    return {
      isValid: false,
      error: {
        title: 'Missing Message Data',
        message: 'Missing message data, please check the configuration and reload.',
      },
    };
  }

  const { message, isHex } = messageData;

  if (typeof message !== 'string' || message.length === 0) {
    return {
      isValid: false,
      error: {
        title: 'Invalid Message',
        message: 'Message must be a non-empty string.',
      },
    };
  }

  if (isHex && !HEX_HASH_RE.test(message)) {
    return {
      isValid: false,
      error: {
        title: 'Invalid Hash',
        message: 'Hex message must be a 0x-prefixed 32-byte hash.',
      },
    };
  }

  return { isValid: true };
};

export const signMessageValidations = {
  validateMessageData,
} satisfies Record<string, ValidationFunction>;
