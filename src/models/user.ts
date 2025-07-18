// src/models/user.ts
export interface UserObject {
  email: string;
  subOrganizationId: string;
  hasPasskey: boolean;
  smartContractAddress: `0x${string}` | null;
  walletAddress: `0x${string}` | null;
  emailVerified: boolean;
}
