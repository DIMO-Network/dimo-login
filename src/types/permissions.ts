import { Permission as PERMISSIONS_FROM_SDK } from '@dimo-network/transactions';

export type PermissionKey = keyof typeof PERMISSIONS_FROM_SDK;
export const PERMISSIONS = Object.keys(PERMISSIONS_FROM_SDK).reduce(
  (acc, key) => {
    acc[key] = key as PermissionKey;
    return acc;
  },
  {} as Record<string, PermissionKey>,
) as Record<PermissionKey, PermissionKey>;

export type PermissionsObject = {
  [K in PermissionKey]: boolean;
};

export const PERMISSIONS_DESCRIPTION: Record<PermissionKey, string> = {
  GetNonLocationHistory:
    'NONLOCATION_TELEMETRY: non-location vehicle data such as fuel levels and odometer.',
  ExecuteCommands:
    'COMMANDS: ability to send commands to the vehicle such as lock and unlock.',
  GetCurrentLocation: 'CURRENT_LOCATION: access to the vehicle current location.',
  GetLocationHistory: 'ALLTIME_LOCATION: access to the vehicle full location history.',
  GetVINCredential:
    'CREDENTIALS: access to any stored credentials and attestations such as insurance and service records.',
  GetLiveData: 'STREAMS: access to real-time data streams.',
  GetRawData: 'RAW_DATA: access to raw payload data.',
  GetApproximateLocation: 'APPROXIMATE_LOCATION: access to approximate vehicle location.',
};