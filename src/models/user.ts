// src/models/account.ts

export interface UserObject {
    email: string;
    subOrganizationId: string;
    hasPasskey: boolean;
    smartContractAddress: string;
    walletAddress: string;
    emailVerified: boolean;
}
  