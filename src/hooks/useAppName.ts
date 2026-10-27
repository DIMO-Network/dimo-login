import { useDevCredentials } from '../context/DevCredentialsContext';
import { useT } from '../i18n';

/** The app's name as users know it: its brand, else the license alias. */
export const useAppName = (): string => {
  const t = useT();
  const { oemBrand, devLicenseAlias } = useDevCredentials();
  return oemBrand?.name || devLicenseAlias || t('common.app_developer_fallback');
};
