export interface FetchPermissionsParams {
  permissionTemplateId?: string;
  permissions?: string;
  clientId: `0x${string}` | null;
  walletAddress: `0x${string}` | null;
  email: string;
  devLicenseAlias: string;
  expirationDate: BigInt;
  region?: string;
}
