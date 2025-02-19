export interface DevCredentialsContextProps {
  clientId: string;
  apiKey: string;
  redirectUri: string;
  invalidCredentials: boolean;
  devLicenseAlias: string;
}
