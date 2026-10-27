import React from 'react';

import { Trans } from '../../i18n';

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
}

export const LegalNotice: React.FC<LegalNoticeProps> = ({ tosUrl, privacyPolicyUrl, brandName }) => {
  // Whole sentences per language: the possessive and word order differ.
  const link = (href: string) => (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- Trans fills the text
    <a href={href} className="underline whitespace-nowrap" />
  );

  return (
    <p className="text-center text-xs text-gray-500">
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
};

export default LegalNotice;
