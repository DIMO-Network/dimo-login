import React from 'react';

export const LegalNotice: React.FC = () => {
  const renderLink = (href: string, text: string) => (
    <a href={href} className="underline whitespace-nowrap">
      {text}
    </a>
  );

  return (
    <p className="flex flex-wrap justify-center text-center text-xs text-gray-500">
      By continuing you agree to our&nbsp;
      {renderLink('https://dimo.org/legal/privacy-policy', 'Privacy Policy')}
      &nbsp;and&nbsp;
      {renderLink('https://dimo.org/legal/terms-of-use', 'Terms of Service')}
    </p>
  );
};

export default LegalNotice;
