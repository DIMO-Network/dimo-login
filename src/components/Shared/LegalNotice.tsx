import React from 'react';

import { Trans, useT } from '../../i18n';

const DEFAULT_TOS_URL = 'https://dimo.org/legal/terms-of-use';
const DEFAULT_PRIVACY_URL = 'https://dimo.org/legal/privacy-policy';

const safeHttpsUrl = (url: string | undefined, fallback: string): string => {
  if (!url) return fallback;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : fallback;
  } catch {
    return fallback;
  }
};

interface LegalNoticeProps {
  tosUrl?: string;
  privacyPolicyUrl?: string;
  brandName?: string;
  /** Under an OEM's branding, say who runs the sign-in. */
  poweredBy?: boolean;
}

export const LegalNotice: React.FC<LegalNoticeProps> = ({
  tosUrl,
  privacyPolicyUrl,
  brandName,
  poweredBy = false,
}) => {
  const t = useT();
  // Whole sentences per language: the possessive and word order differ.
  const link = (href: string) => (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- Trans fills the text
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whitespace-nowrap text-ink underline underline-offset-2"
    />
  );

  const notice = (
    <p className="text-center text-label font-normal text-muted">
      <Trans
        k={brandName ? 'legal.notice_brand' : 'legal.notice'}
        values={{ brandName }}
        components={{
          privacy: link(safeHttpsUrl(privacyPolicyUrl, DEFAULT_PRIVACY_URL)),
          terms: link(safeHttpsUrl(tosUrl, DEFAULT_TOS_URL)),
        }}
      />
    </p>
  );
  if (!poweredBy) return notice;
  return (
    <div className="flex flex-col gap-1.5">
      {notice}
      <p className="text-center text-[11px] leading-[14px] text-muted">
        {t('app.powered_by')}
      </p>
    </div>
  );
};

export default LegalNotice;
