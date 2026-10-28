export enum AuthProvider {
  TESLA = 'tesla',
  GOOGLE = 'google',
  APPLE = 'apple',
  CONNECT = 'connect',
}

// `state` carries only what the return needs besides the flow, which is in the
// snapshot `flowRef` names (flowSnapshot.ts). A return without that snapshot
// isn't trusted, so nothing else would be read from `state` anyway.
interface AuthUrlParams {
  provider: AuthProvider;
  // Where the flow continues on return when not the snapshot's (Tesla: CONNECT_TESLA).
  entryState?: string;
  referrer?: string;
  vehicleToAdd?: {
    make: string;
    model: string;
    year: string;
    deviceDefinitionId: string;
    vin?: string;
    country: string;
  };
  flowRef: string;
}

export function constructAuthUrl(params: AuthUrlParams): string {
  switch (params.provider) {
    case AuthProvider.TESLA:
      return getTeslaAuthUrl(params);
    case AuthProvider.GOOGLE:
      return getEmailAuthUrl(params);
    case AuthProvider.APPLE:
      return getEmailAuthUrl(params);
    default:
      throw new Error(`Unsupported provider: ${params.provider}`);
  }
}

function buildStateParams(params: AuthUrlParams): Record<string, unknown> {
  return {
    provider: params.provider,
    flowRef: params.flowRef,
    entryState: params.entryState,
    referrer: params.referrer ?? document.referrer,
    vehicleToAdd: params.vehicleToAdd,
  };
}

function getTeslaAuthUrl(params: AuthUrlParams): string {
  const stateParams = buildStateParams(params);

  const scope = [
    'openid',
    'offline_access',
    'user_data',
    'vehicle_device_data',
    'vehicle_cmds',
    'vehicle_charging_cmds',
    'vehicle_location',
  ].join(' ');

  console.log(scope);

  return `https://auth.tesla.com/oauth2/v3/authorize
    ?client_id=${process.env.REACT_APP_TESLA_CLIENT_ID}
    &redirect_uri=${encodeURIComponent(
      process.env.REACT_APP_TESLA_REDIRECT_URI as string,
    )}
    &prompt_missing_scopes=true
    &response_type=code
    &scope=${encodeURIComponent(scope)}
    &state=${encodeURIComponent(JSON.stringify(stateParams))}`.replace(/\s+/g, '');
}

export const getOAuthRedirectUri = () => {
  return process.env.REACT_APP_ENVIRONMENT === 'prod'
    ? 'https://login.dimo.org'
    : 'https://login.dev.dimo.org';
};

function getEmailAuthUrl(params: AuthUrlParams): string {
  const stateParams = buildStateParams(params);
  return `${process.env.REACT_APP_DIMO_AUTH_URL}/auth/${params.provider}
    ?client_id=login-with-dimo
    &redirect_uri=${getOAuthRedirectUri()}
    &response_type=code
    &scope=openid%20email
    &state=${encodeURIComponent(JSON.stringify(stateParams))}`.replace(/\s+/g, '');
}
