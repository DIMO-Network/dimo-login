export interface FetchPermissionsParams {
  permissionTemplateId: string;
  clientId: string;
  walletAddress: string;
  email: string;
  devLicenseAlias: string;
  expirationDate: BigInt;
}
