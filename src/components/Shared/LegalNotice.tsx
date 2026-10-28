import React from 'react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
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

const isHttpsUrl = (url: string | undefined) => safeHttpsUrl(url, '') !== '';

/**
 * "By continuing you agree to …", with the app's own privacy policy and terms
 * when it gave them (SDK options, query or console configuration), else
 * DIMO's. The app is named only on its own documents.
 */
export const LegalNotice: React.FC = () => {
  const t = useT();
  const { tosUrl, privacyPolicyUrl, oemBrand, devLicenseAlias } = useDevCredentials();
  const brandName = oemBrand?.name || devLicenseAlias || undefined;
  const ownDocuments = isHttpsUrl(tosUrl) && isHttpsUrl(privacyPolicyUrl);
  // Under an OEM's branding, say who runs the sign-in.
  const poweredBy = !!oemBrand;
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
        k={brandName && ownDocuments ? 'legal.notice_brand' : 'legal.notice'}
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
