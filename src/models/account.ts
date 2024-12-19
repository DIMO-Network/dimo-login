export interface CreateAccountParams {
  email: string;
  apiKey: string;
  attestation: object; // Adjust this type if there's a more specific structure for attestation
  challenge: string;
  deployAccount: boolean;
}
