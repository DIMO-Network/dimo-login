import { SACDTemplate } from '@dimo-network/transactions/dist/core/types/dimo';
import { Permission } from '@dimo-network/transactions';
import { generatePermissionsSACDTemplate } from '@dimo-network/transactions/dist/core/actions/setPermissionsSACD';

import { FetchPermissionsParams } from '../models/permissions';
import { POLICY_ATTACHMENT_CID_BY_REGION } from '../enums';
import { formatBigIntAsReadableDate } from '../utils/dateUtils';
import { PERMISSIONS_DESCRIPTION } from '../types';

const isPermissionAllowed = ({
  permissionTemplateId,
  permission,
  currentPermissionString = '0',
}: {
  permissionTemplateId?: string;
  permission: Permission;
  currentPermissionString?: string;
}) => {
  let isSet = currentPermissionString === '1';

  if (
    permissionTemplateId &&
    permission === Permission.ExecuteCommands &&
    permissionTemplateId !== '1'
  ) {
    isSet = false;
  }
  return isSet;
};

export const createPermissionsObject = (
  permissionString: string = '',
  permissionTemplateId?: string,
): Permission[] => {
  const permissionEntries = Object.entries(Permission)
    .filter(([key]) => isNaN(Number(key)))
    .map<[Permission, boolean]>(([, value], index) => [
      value as Permission,
      isPermissionAllowed({
        permissionTemplateId,
        permission: value as Permission,
        currentPermissionString: permissionString[index],
      }),
    ]);

  return permissionEntries
    .filter(([, isEnabled]) => isEnabled)
    .map(([permission]) => permission);
};

export const getPermissionsDescription = (permissions: Permission[]): string[] => {
  return permissions
    .map(
      (permission) =>
        PERMISSIONS_DESCRIPTION[
          permission as unknown as keyof typeof PERMISSIONS_DESCRIPTION
        ],
    )
    .filter((description) => !!description);
};

export const getDescription = (args: {
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

  const perms = createPermissionsObject(permissions, permissionTemplateId);
  const contractAttachmentLink = getContractAttachmentLink(region);
  const currentTime = new Date();
  const currentTimeBigInt = BigInt(Math.floor(currentTime.getTime() / 1000));
  const permissionsString = getPermissionsDescription(perms).join('\n');

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
