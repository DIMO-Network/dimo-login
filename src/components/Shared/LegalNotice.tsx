import React from 'react';

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
  const renderLink = (href: string, text: string) => (
    <a href={href} className="underline whitespace-nowrap">
      {text}
    </a>
  );

  const owner = brandName ? `${brandName}'s` : 'our';

  return (
    <p className="flex flex-wrap justify-center text-center text-xs text-gray-500">
      By continuing you agree to {owner}&nbsp;
      {renderLink(safeHttpsUrl(privacyPolicyUrl, DEFAULT_PRIVACY_URL), 'Privacy Policy')}
      &nbsp;and&nbsp;
      {renderLink(safeHttpsUrl(tosUrl, DEFAULT_TOS_URL), 'Terms of Service')}
    </p>
  );
};

export default LegalNotice;
