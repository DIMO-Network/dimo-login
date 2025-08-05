import { Permission } from '@dimo-network/transactions';

import { POLICY_ATTACHMENT_CID_BY_REGION } from '../enums';
import { formatBigIntAsReadableDate } from '../utils/dateUtils';
import { PERMISSIONS, PERMISSIONS_DESCRIPTION } from '../types';

export const createPermissionsByTemplateId = (
  permissionTemplateId?: string,
): Permission[] => {
  if (permissionTemplateId) {
    const perms: Permission[] = [
      Permission[PERMISSIONS.GetNonLocationHistory],
      Permission[PERMISSIONS.GetCurrentLocation],
      Permission[PERMISSIONS.GetLocationHistory],
      Permission[PERMISSIONS.GetVINCredential],
      Permission[PERMISSIONS.GetLiveData],
    ];

    if (permissionTemplateId === '1') {
      perms.push(Permission[PERMISSIONS.ExecuteCommands]);
    }

    return perms;
  }

  return [];
};

export const createPermissionsByString = (permissionString: string): Permission[] => {
  const permissionEntries = Object.entries(PERMISSIONS)
    .filter(([key]) => isNaN(Number(key)))
    .map<[Permission, boolean]>(([, value], index) => [
      Permission[value],
      (permissionString[index] ?? '0') === '1',
    ]);

  return permissionEntries
    .filter(([, isEnabled]) => isEnabled)
    .map(([permission]) => permission);
};

export const createPermissionsFromParams = (
  permissionString: string = '',
  permissionTemplateId?: string,
): Permission[] => {
  if (permissionTemplateId) {
    return createPermissionsByTemplateId(permissionTemplateId);
  }

  return createPermissionsByString(permissionString);
};

export const getPermissionsDescription = (permissions: Permission[]): string => {
  return permissions
    .map(
      (permission) =>
        `\n- ${
          PERMISSIONS_DESCRIPTION[
            Permission[permission] as unknown as keyof typeof PERMISSIONS_DESCRIPTION
          ]
        }`,
    )
    .filter((description) => !!description)
    .join('');
};

export const getTemplateDescription = (args: {
  email: string;
  devLicenseAlias: string;
  permissions: string;
  permissionTemplateId?: string;
  expirationDate: BigInt;
  region?: string;
}): string => {
  const {
    email,
    devLicenseAlias,
    permissions,
    permissionTemplateId,
    expirationDate,
    region,
  } = args;

  const perms = createPermissionsFromParams(permissions, permissionTemplateId);
  const contractAttachmentLink = getContractAttachmentLink(region);
  const currentTime = new Date();
  const currentTimeBigInt = BigInt(Math.floor(currentTime.getTime() / 1000));
  const permissionsString = getPermissionsDescription(perms);

  const description = `This contract gives permission for specific data access and control functions on the DIMO platform. Here's what you're agreeing to:\n\nContract Summary:\n- Grantor: ${email} (the entity giving permission).\n- Grantee: ${devLicenseAlias}  (the entity receiving permission).\n\n${contractAttachmentLink}\n\nPermissions Granted:${permissionsString}\n\nEffective Date: ${formatBigIntAsReadableDate(
    currentTimeBigInt,
  )} \n\nExpiration Date: ${formatBigIntAsReadableDate(
    expirationDate,
  )}.\n\nDetails:\n- This grant provides the grantee with access to specific vehicle data and control functions as specified above.\n- Created by DIMO Platform, version 1.0 of this contract template.\n\nBy signing, both parties agree to these terms and the specified access scope.`;

  return description;
};

export const getContractAttachmentLink = (region?: string): string => {
  if (!region || region in POLICY_ATTACHMENT_CID_BY_REGION) {
    return '';
  }
  const cid =
    POLICY_ATTACHMENT_CID_BY_REGION[
      region as keyof typeof POLICY_ATTACHMENT_CID_BY_REGION
    ];
  return `<a href="https://${cid}.ipfs.w3s.link/agreement-${region.toLowerCase()}.pdf" target="_blank">Contract Attachment</a>`;
};
