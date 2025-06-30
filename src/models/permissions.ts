export interface FetchPermissionsParams {
  permissionTemplateId?: string;
  permissions?: string;
  clientId: string;
  walletAddress: string;
  email: string;
  devLicenseAlias: string;
  expirationDate: BigInt;
  region?: string;
}
