import React from 'react';

import { OriginChip } from '../ui';

interface HeaderProps {
  title: string;
  subtitle?: string;
  link?: string;
  description?: string;
}

const hostOf = (link: string) => {
  try {
    return new URL(link).host;
  } catch {
    return link;
  }
};

/**
 * A screen's title block. Back and the logo live in AppShell's top bar. The
 * heading takes focus when the screen changes (data-screen-heading).
 */
export const Header: React.FC<HeaderProps> = ({ title, subtitle, link, description }) => (
  <div className="flex w-full flex-col items-start gap-2">
    <h1 tabIndex={-1} data-screen-heading className="text-title text-ink outline-none">
      {title}
    </h1>
    {link ? (
      <OriginChip host={subtitle || hostOf(link)} />
    ) : (
      subtitle && <p className="text-body-sm text-muted">{subtitle}</p>
    )}
    {description && <p className="text-body-sm text-muted">{description}</p>}
  </div>
);

export default Header;
