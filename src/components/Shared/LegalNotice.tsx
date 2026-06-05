import React from 'react';

const DEFAULT_TOS_URL = 'https://dimo.org/legal/terms-of-use';

const safeHttpsUrl = (url?: string): string => {
  if (!url) return DEFAULT_TOS_URL;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : DEFAULT_TOS_URL;
  } catch {
    return DEFAULT_TOS_URL;
  }
};

interface LegalNoticeProps {
  tosUrl?: string;
  brandName?: string;
}

export const LegalNotice: React.FC<LegalNoticeProps> = ({ tosUrl, brandName }) => {
  const renderLink = (href: string, text: string) => (
    <a href={href} className="underline whitespace-nowrap">
      {text}
    </a>
  );

  const owner = brandName ? `${brandName}'s` : 'our';

  return (
    <p className="flex flex-wrap justify-center text-center text-xs text-gray-500">
      By continuing you agree to {owner}&nbsp;
      {renderLink('https://dimo.org/legal/privacy-policy', 'Privacy Policy')}
      &nbsp;and&nbsp;
      {renderLink(safeHttpsUrl(tosUrl), 'Terms of Service')}
    </p>
  );
};

export default LegalNotice;
