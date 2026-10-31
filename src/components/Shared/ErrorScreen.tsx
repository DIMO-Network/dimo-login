import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { translateText, useT, type Text } from '../../i18n';

interface ErrorProps {
  title: Text;
  message: Text;
}

/** Rendered inside AppShell (App.tsx), which provides the frame. */
export const ErrorScreen: React.FC<ErrorProps> = ({ title, message }) => (
  <ErrorContent title={title} message={message} />
);

export const ErrorContent = ({ title, message }: ErrorProps) => {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-2 py-4" role="alert">
      <span className="mb-1 flex size-12 items-center justify-center rounded-[14px] bg-card text-negative">
        <ExclamationTriangleIcon className="size-6" aria-hidden="true" />
      </span>
      <h1
        tabIndex={-1}
        data-screen-heading
        className="text-title text-ink outline-hidden"
      >
        {translateText(title, t)}
      </h1>
      <p className="text-body-sm text-muted">{translateText(message, t)}</p>
    </div>
  );
};
