// src/models/account.ts

export interface UserObject {
    email: string;
    subOrganizationId: string | null;
    hasPasskey: boolean;
    smartContractAddress: string | null;
    walletAddress: string | null;
    emailVerified: boolean;
}
  