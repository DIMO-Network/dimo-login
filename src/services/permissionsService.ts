import { SACDTemplate } from '@dimo-network/transactions/dist/core/types/dimo';
import { VehiclePermissionDescription } from '@dimo-network/transactions/dist/core/types/args';

import { FetchPermissionsParams } from '../models/permissions';
import {
  getSacdDescription,
  getSacdPermissionArray,
  getSacdValue,
} from './turnkeyService';
import { formatBigIntAsReadableDate } from '../utils/dateUtils';
import { PERMISSIONS, PermissionsObject } from '../types/permissions';
import { POLICY_ATTACHMENT_CID_BY_REGION } from '../enums';

const createPermissionsObject = (permissionString: string): PermissionsObject =>
  Object.fromEntries(
    Object.keys(PERMISSIONS).map((key, index) => [
      key,
      (permissionString?.[index] ?? '0') === '1',
    ]),
  ) as PermissionsObject;

export const getPermsValue = (
  permissionTemplateId?: string,
  permissions?: string,
): bigint => {
  let permissionString = permissions;
  if (permissionTemplateId) {
    permissionString = `1${permissionTemplateId === '1' ? '1' : '0'}1111`;
  }
  return getSacdValue(createPermissionsObject(permissionString as string));
};

export const getPermissionArray = (perms: bigint): string[] => {
  return getSacdPermissionArray(perms);
};

export function getDescription(args: VehiclePermissionDescription): string {
  return getSacdDescription(args);
}

export const getContractAttachmentLink = (
  region: keyof typeof POLICY_ATTACHMENT_CID_BY_REGION,
): string => {
  const cid = POLICY_ATTACHMENT_CID_BY_REGION[region];
  if (!cid) {
    return '';
  }
  // BARRETT TODO: Revert back after DEMO
  // return `<a href="https://${cid}.ipfs.w3s.link/agreement-${region.toLowerCase()}.pdf" target="_blank">Contract Attachment</a>`;
  return `<a href="https://assets.dimo.org/ipfs/${cid}" target="_blank">Contract Attachment</a>`
};

export const fetchPermissionsFromId = async ({
  permissionTemplateId,
  permissions,
  clientId,
  walletAddress,
  email,
  devLicenseAlias,
  expirationDate,
  region,
}: FetchPermissionsParams): Promise<SACDTemplate> => {
  const templateId = '$uuid';

  // Call helpers, that will communicate with the transactionService, which has access to the SDK
  // Not necessary, but the abstraction makes it easier for us to mock responses etc
  const permsValue = getPermsValue(permissionTemplateId, permissions);
  const permissionArray = getPermissionArray(permsValue);

  const currentTime = new Date();
  const currentTimeBigInt = BigInt(Math.floor(currentTime.getTime() / 1000));

  let permissionsString = ``;
  for (const perm of permissionArray) {
    permissionsString += `\n- ${perm}`;
  }

  const contractAttachmentLink =
    region && region in POLICY_ATTACHMENT_CID_BY_REGION
      ? getContractAttachmentLink(region as keyof typeof POLICY_ATTACHMENT_CID_BY_REGION)
      : '';
  console.log('contractAttachmentLink', contractAttachmentLink);
  console.log('region', region);
  const urlMatch = contractAttachmentLink.match(/href="([^"]*)"/);
  const extractedAttachmentUrl = urlMatch ? urlMatch[1] : '';
  
  console.log('urlMatch:', urlMatch);
  console.log('extractedAttachmentUrl:', extractedAttachmentUrl);

  const description = `This contract gives permission for specific data access and control functions on the DIMO platform. Here’s what you’re agreeing to:\n\nContract Summary:\n- Grantor: ${email} (the entity giving permission).\n- Grantee: ${devLicenseAlias}  (the entity receiving permission).\n\n${contractAttachmentLink}\n\nPermissions Granted:${permissionsString}\n\nEffective Date: ${formatBigIntAsReadableDate(
    currentTimeBigInt,
  )} \n\nExpiration Date: ${formatBigIntAsReadableDate(
    expirationDate,
  )}.\n\nDetails:\n- This grant provides the grantee with access to specific vehicle data and control functions as specified above.\n- Created by DIMO Platform, version 1.0 of this contract template.\n\nBy signing, both parties agree to these terms and the specified access scope.`;

  const template: SACDTemplate = {
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
      attachments: extractedAttachmentUrl ? [extractedAttachmentUrl] : [],
      description,
    },
  };
  return template;
};
