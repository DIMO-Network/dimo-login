import React, { useId } from 'react';

import { cn } from '../ui/cn';

/**
 * One app in a connected-apps section: its name, what it has (a line of
 * items), an optional note and its action. A list item named by the app.
 */
export const AppRow = ({
  name,
  details = [],
  note,
  action,
  muted = false,
}: {
  name: string;
  details?: string[];
  note?: string;
  action: React.ReactNode;
  muted?: boolean;
}) => {
  const nameId = useId();
  return (
    <li
      aria-labelledby={nameId}
      className="flex min-w-0 items-center gap-3 rounded-control bg-card px-3 py-2.5"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          id={nameId}
          className={cn(
            'text-body-sm font-medium wrap-anywhere',
            muted ? 'text-muted' : 'text-ink',
          )}
        >
          {name}
        </span>
        {details.length > 0 && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label font-normal text-muted">
            {details.map((detail, i) => (
              <React.Fragment key={detail}>
                {i > 0 && <span aria-hidden="true">·</span>}
                <span>{detail}</span>
              </React.Fragment>
            ))}
          </span>
        )}
        {note && <span className="text-label font-normal text-muted">{note}</span>}
      </span>
      {action}
    </li>
  );
};

export default AppRow;
