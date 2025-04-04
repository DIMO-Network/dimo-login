export type AuthProvider = 'smartcar' | 'tesla' | 'google' | 'apple' | 'connect';

interface AuthUrlParams {
  provider: AuthProvider;
  clientId?: string;
  redirectUri: string;
  emailPermissionGranted?: boolean;
  altTitle?: boolean;
  entryState?: string;
  referrer?: string;
  utm?: string[];
  vehicleMakes?: string[];
  onboarding?: string[];
  vehicles?: string[];
  permissionTemplateId?: string | null;
  expirationDate?: string | null;
  vehicleToAdd?: {
    make: string;
    model: string;
    year: string;
    deviceDefinitionId: string;
    vin?: string;
    country: string;
  };
  testMode?: boolean; // Smartcar test mode
}

export function constructAuthUrl(params: AuthUrlParams): string {
  switch (params.provider) {
    case 'smartcar':
      return getSmartcarAuthUrl(params);
    case 'tesla':
      return getTeslaAuthUrl(params);
    case 'google':
      return getEmailAuthUrl(params);
    case 'apple':
      return getEmailAuthUrl(params);
    default:
      throw new Error(`Unsupported provider: ${params.provider}`);
  }
}

function buildStateParams(params: AuthUrlParams): Record<string, any> {
  return {
    clientId: params.clientId,
    emailPermissionGranted: params.emailPermissionGranted,
    entryState: params.entryState,
    expirationDate: params.expirationDate,
    permissionTemplateId: params.permissionTemplateId,
    redirectUri: params.redirectUri,
    referrer: params.referrer ?? document.referrer,
    utm: params.utm ?? [],
    vehicleMakes: params.vehicleMakes ?? [],
    onboarding: params.onboarding ?? [],
    vehicles: params.vehicles ?? [],
    vehicleToAdd: params.vehicleToAdd,
    altTitle: params.altTitle,
    testMode: params.testMode,
    provider: params.provider,
  };
}

function getSmartcarAuthUrl(params: AuthUrlParams): string {
  let url = `https://connect.smartcar.com/oauth/authorize`;
  url += `?response_type=code`;
  url += `&client_id=${process.env.REACT_APP_SMARTCAR_CLIENT_ID}`; //TODO: Remove Hardcode
  url += `&redirect_uri=${encodeURIComponent(params.redirectUri)}`;
  url += `&scope=${encodeURIComponent('required:read_vehicle_info')}`;
  url += `&approval_prompt=force`; // Force login
  url += `&single_select=true`; // User can only select one car

  if (process.env.REACT_APP_ENVIRONMENT !== 'prod') {
    url += `&mode=simulated`;
  }

  const stateParams = buildStateParams(params);

  url += `&state=${encodeURIComponent(JSON.stringify(stateParams))}`;

  // if (params.make) {
  //   url += `&make=${encodeURIComponent(params.make)}`;
  // }

  // if (params.countryCode) {
  //   url += `&flags=country:${params.countryCode}`;
  // }

  return url;
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

function getEmailAuthUrl(params: AuthUrlParams): string {
  const stateParams = buildStateParams(params);

  const dimoRedirectUri =
    process.env.REACT_APP_ENVIRONMENT === 'prod'
      ? 'https://login.dimo.org'
      : 'https://login.dev.dimo.org';

  return `${process.env.REACT_APP_DIMO_AUTH_URL}/auth/${params.provider}
    ?client_id=login-with-dimo
    &redirect_uri=${dimoRedirectUri}
    &response_type=code
    &scope=openid%20email
    &state=${encodeURIComponent(JSON.stringify(stateParams))}`.replace(/\s+/g, '');
}
