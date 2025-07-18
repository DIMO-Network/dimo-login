export interface GenerateChallengeParams {
  clientId: `0x${string}` | null;
  domain: string;
  scope: string;
  address: string;
}

export interface SubmitChallengeParams {
  clientId: `0x${string}` | null;
  domain: string;
  state: string;
  signature: string;
}

export interface SubmitCodeExchangeParams {
  clientId: string;
  code: string;
  redirectUri: string;
}
