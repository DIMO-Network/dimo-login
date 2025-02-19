import { SACDTemplate } from '@dimo-network/transactions/dist/core/types/dimo';
import { getSacdPermissionArray, getSacdValue } from './turnkeyService';
import { formatBigIntAsReadableDate } from '@utils/dateUtils';
import { FetchPermissionsParams } from '@models/permissions';

//Helper functions that communicate with the transactions service
export function getPermsValue(permissionTemplateId: string): bigint {
  return getSacdValue({
    NONLOCATION_TELEMETRY: true,
    COMMANDS: permissionTemplateId == '1',
    CURRENT_LOCATION: true,
    ALLTIME_LOCATION: true,
    CREDENTIALS: true,
    STREAMS: true,
  });
}

export function getPermissionArray(perms: bigint): string[] {
  return getSacdPermissionArray(perms);
}

export async function fetchPermissionsFromId({
  permissionTemplateId,
  clientId,
  walletAddress,
  email,
  devLicenseAlias,
  expirationDate,
}: FetchPermissionsParams): Promise<SACDTemplate> {
  const templateId = '$uuid';

  //Call helpers, that will communicate with the transactionService, which has access to the SDK
  //Not necessary, but the abstraction make it easier for us to mock responses etc
  const permissionsValue = getPermsValue(permissionTemplateId);

  const permissionArray = getPermissionArray(permissionsValue);

  const currentTime = new Date();
  const currentTimeBigInt = BigInt(Math.floor(currentTime.getTime() / 1000));

  let permissionsString = ``;
  for (const perm of permissionArray) {
    permissionsString += `\n- ${perm}`;
  }

  const description = `This contract gives permission for specific data access and control functions on the DIMO platform. Here’s what you’re agreeing to:\n\nContract Summary:\n- Grantor: ${email} (the entity giving permission).\n- Grantee: ${devLicenseAlias}  (the entity receiving permission).\n\nPermissions Granted:${permissionsString}\n\nEffective Date: ${formatBigIntAsReadableDate(
    currentTimeBigInt
  )} \n\nExpiration Date: ${formatBigIntAsReadableDate(
    expirationDate
  )}.\n\nDetails:\n- This grant provides the grantee with access to specific vehicle data and control functions as specified above.\n- Created by DIMO Platform, version 1.0 of this contract template.\n\nBy signing, both parties agree to these terms and the specified access scope.`;

  return {
    specVersion: '1.0',
    id: templateId,
    type: 'org.dimo.permission.grant.v1',
    datacontentype: 'application/json',
    time: currentTime.toISOString(),
    data: {
      templateId: templateId,
      version: '1.0',
      grantor: walletAddress,
      grantee: clientId,
      scope: {
        permissions: permissionArray,
      },
      effectiveAt: currentTime.toISOString(),
      expiresAt: new Date(Number(expirationDate) * 1000).toISOString(),
      attachments: [],
      description,
    },
  };
}
