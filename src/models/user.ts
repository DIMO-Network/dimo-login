// src/models/user.ts
export interface UserObject {
  email: string;
  subOrganizationId: string;
  hasPasskey: boolean;
  smartContractAddress: `0x${string}` | null;
  walletAddress: `0x${string}` | null;
  emailVerified: boolean;
  /**
   * The credential IDs of the account's recorded passkeys (base64url), as the
   * accounts API listed them when it was looked up; absent when it sent none.
   * Kept in memory only: never written to storage.
   */
  credentialIds?: string[];
}
