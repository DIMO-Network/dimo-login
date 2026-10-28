// components/Shared/ErrorMessage.tsx
import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

import { translateText, useT, type Text } from '../../i18n';

interface ErrorMessageProps {
  message: Text;
}

/** The icon carries the error color; the words stay readable fg. */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  const t = useT();
  return (
    <p
      role="alert"
      className="flex w-full items-start gap-2 rounded-control bg-negative-soft p-3 text-left text-body-sm text-fg"
    >
      <ExclamationCircleIcon
        className="mt-px size-[18px] shrink-0 text-negative"
        aria-hidden="true"
      />
      <span className="min-w-0">{translateText(message, t)}</span>
    </p>
  );
};

export default ErrorMessage;
