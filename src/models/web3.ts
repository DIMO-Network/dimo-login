export interface GenerateChallengeParams {
    clientId: string;
    domain: string;
    scope: string;
    address: string;
}

export interface SubmitChallengeParams {
    clientId: string;
    domain: string;
    state: string;
    signature: string;
}

export interface SubmitCodeExchangeParams {
    clientId: string;
    code: string;
    redirectUri: string;
}