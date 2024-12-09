import { SACDTemplate } from "@dimo-network/transactions/dist/core/types/dimo";
import { getSacdDescription, getSacdPermissionArray, getSacdValue } from "./turnkeyService";
import { VehcilePermissionDescription } from "@dimo-network/transactions/dist/core/types/args";


//Helper functions that communicate with the transactions service
export function getPermsValue(permissionTemplateId: string) {
  const newPermissions = getSacdValue({
    ALLTIME_NONLOCATION: true,
    COMMANDS: permissionTemplateId == "1",
    CURRENT_LOCATION: true,
    ALLTIME_LOCATION: true,
    VERIFIABLE_CREDENTIALS: true,
    STREAMS: true,
  });

  return newPermissions;
}

export function getPermissionArray(perms: bigint) {
  getSacdPermissionArray(perms);
}

export function getDescription(args: VehcilePermissionDescription) {
  return getSacdDescription(args);
}

export function getExpiration() {
  return BigInt(2933125200); //TODO: Make this a constant
}

export async function fetchPermissionsFromId(
  permissionTemplateId: string,
  clientId: string,
  walletAddress: string,
  email: string,
  devLicenseAlias: string
) {
  const templateId = "$uuid";


  //Call helpers, that will communicate with the transactionService, which has access to the SDK
  //Not necessary, but the abstraction make it easier for us to mock responses etc
  const permissionsValue = getPermsValue(permissionTemplateId);

  const permissionArray = getSacdPermissionArray(permissionsValue);

  const expiration = getExpiration();

  const currentTime = new Date();
  const description = getDescription({
    driverID: clientId,
    appID: clientId,
    appName: devLicenseAlias,
    expiration,
    permissionArray: permissionArray,
    effectiveAt: currentTime.toISOString(),
  });

  //TEMP SETUP, HARDCODE DESCRIPTION
  const permissionsString1 = `\n- ALLTIME_NONLOCATION: Access to non-location-based data at any time.\n- COMMANDS: Ability to send commands to the vehicle.\n- CURRENT_LOCATION: Access to the vehicle’s current location.\n- ALLTIME_LOCATION: Access to location history.\n- VERIFIABLE_CREDENTIALS: Access to data that can be used as verifiable credentials.\n- STREAMS: Access to real-time data streams.`;
  const permissionsString2 = `\n- ALLTIME_NONLOCATION: Access to non-location-based data at any time.\n- CURRENT_LOCATION: Access to the vehicle’s current location.\n- ALLTIME_LOCATION: Access to location history.\n- VERIFIABLE_CREDENTIALS: Access to data that can be used as verifiable credentials.\n- STREAMS: Access to real-time data streams.`;  
  const tempHardcodedDesc = `This contract gives permission for specific data access and control functions on the DIMO platform. Here’s what you’re agreeing to:\n\nContract Summary:\n- Grantor: ${email} (the entity giving permission).\n- Grantee: ${devLicenseAlias}  (the entity receiving permission).\n\nPermissions Granted:${
        permissionTemplateId == "1" ? permissionsString1 : permissionsString2
      }\n\nEffective Date: ${currentTime.toISOString()} \n\nExpiration Date: December 12, 2062, at 18:51 UTC.\n\nDetails:\n- This grant provides the grantee with access to specific vehicle data and control functions as specified above.\n- Created by DIMO Platform, version 1.0 of this contract template.\n\nBy signing, both parties agree to these terms and the specified access scope.`

  const template: SACDTemplate = {
    specVersion: "1.0",
    id: templateId,
    type: "org.dimo.permission.grant.v1",
    datacontentype: "application/json",
    time: currentTime.toISOString(),
    data: {
      templateId: templateId,
      version: "1.0",
      grantor: walletAddress,
      grantee: clientId,
      scope: {
        permissions: permissionArray,
      },
      effectiveAt: currentTime.toISOString(),
      expiresAt: new Date(Number(expiration) * 1000).toISOString(),
      attachments: [],
      description: tempHardcodedDesc,
    },
  };

  return template;
}