import { Permission } from '@dimo-network/transactions';

import { POLICY_ATTACHMENT_CID_BY_REGION } from '../enums';
import { formatBigIntAsReadableDate } from '../utils/dateUtils';
import {
  Attachment,
  CloudEventAgreement,
  PERMISSIONS,
  PERMISSIONS_DESCRIPTION,
} from '../types';
import { ATTESTATION_FILE_TAGS } from '../types/filetags';

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

// New function to generate attachments array that can be reused
export const generateAttachments = (region?: string): Attachment[] => {
  if (!region || !(region in POLICY_ATTACHMENT_CID_BY_REGION)) {
    return [];
  }

  const contractAttachmentLink = getContractAttachmentLink(
    region as keyof typeof POLICY_ATTACHMENT_CID_BY_REGION,
  );
  const urlMatch = contractAttachmentLink.match(/href="([^"]*)"/);
  const extractedAttachmentUrl = urlMatch ? urlMatch[1] : '';

  return extractedAttachmentUrl
    ? [
        {
          name: 'Policy',
          description: 'Policy Attachment',
          contentType: 'application/pdf',
          url: extractedAttachmentUrl,
        },
      ]
    : [];
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

export const getFilesRequestedString = (fileTags: string[] | undefined): string => {
  if (!fileTags) {
    return '\n- NONE';
  }

  return fileTags.map((tag) => `\n- ${ATTESTATION_FILE_TAGS[tag]}`).join('');
};

export const getTemplateDescription = (args: {
  email: string;
  devLicenseAlias: string;
  permissions: string;
  permissionTemplateId?: string;
  fileTags: string[] | undefined;
  expirationDate: BigInt;
  region?: string;
}): string => {
  const {
    email,
    devLicenseAlias,
    permissions,
    permissionTemplateId,
    fileTags,
    expirationDate,
    region,
  } = args;

  const perms = createPermissionsFromParams(permissions, permissionTemplateId);
  const contractAttachmentLink =
    region && region in POLICY_ATTACHMENT_CID_BY_REGION
      ? getContractAttachmentLink(region)
      : '';
  const currentTime = new Date();
  const currentTimeBigInt = BigInt(Math.floor(currentTime.getTime() / 1000));
  const permissionsString = getPermissionsDescription(perms);
  const filesRequestedString = getFilesRequestedString(fileTags);

  const description = [
    'This contract gives permission for specific data access and control functions on the DIMO platform.',
    "Here's what you're agreeing to:",
    '',
    'Contract Summary:',
    `- Grantor: ${email} (the entity giving permission).`,
    `- Grantee: ${devLicenseAlias} (the entity receiving permission).`,
    '',
    contractAttachmentLink,
    '',
    `Permissions Granted: ${permissionsString}`,
    '',
    `Files Requested: ${filesRequestedString}`,
    '',
    `Effective Date: ${formatBigIntAsReadableDate(currentTimeBigInt)}`,
    `Expiration Date: ${formatBigIntAsReadableDate(expirationDate)}.`,
    '',
    'Details:',
    '- This grant provides the grantee with access to specific vehicle data and control functions as specified above.',
    '- Created by DIMO Platform, version 1.0 of this contract template.',
    '',
    'By signing, both parties agree to these terms and the specified access scope.',
  ].join('\n');

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

  // BARRETT TODO: Revert back after DEMO
  // return `<a href="https://${cid}.ipfs.w3s.link/agreement-${region.toLowerCase()}.pdf" target="_blank">Contract Attachment</a>`;
  return `<a href="https://assets.dimo.org/ipfs/${cid}" target="_blank">Contract Attachment</a>`;
};
