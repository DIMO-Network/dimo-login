// components/Shared/ErrorMessage.tsx
import React from 'react';

import { translateText, useT, type Text } from '../../i18n';

interface ErrorMessageProps {
  message: Text;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  const t = useT();
  return (
    <p className="text-red-500 text-center font-medium" role="alert">
      {translateText(message, t)}
    </p>
  );
};

export default ErrorMessage;
