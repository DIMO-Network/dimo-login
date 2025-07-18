import { SACDTemplate } from '@dimo-network/transactions/dist/core/types/dimo';
import { VehiclePermissionDescription } from '@dimo-network/transactions/dist/core/types/args';
import { Permission } from '@dimo-network/transactions';
import { generatePermissionsSACDTemplate } from '@dimo-network/transactions/dist/core/actions/setPermissionsSACD';

import { FetchPermissionsParams } from '../models/permissions';
import { getSacdDescription } from './turnkeyService';
import { POLICY_ATTACHMENT_CID_BY_REGION } from '../enums';

export const createPermissionsObject = (permissionString: string = ''): Permission[] => {
  const permissionEntries = Object.entries(Permission)
    .filter(([key]) => isNaN(Number(key)))
    .map<[Permission, boolean]>(([, value], index) => [
      value as Permission,
      (permissionString?.[index] ?? '0') === '1',
    ]);

  return permissionEntries
    .filter(([, isEnabled]) => isEnabled)
    .map(([permission]) => permission);
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
  return `<a href="https://${cid}.ipfs.w3s.link/agreement-${region.toLowerCase()}.pdf" target="_blank">Contract Attachment</a>`;
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
  if (!clientId || !walletAddress) {
    throw new Error('Client ID or wallet address is required');
  }
  const contractAttachmentLink =
    region && region in POLICY_ATTACHMENT_CID_BY_REGION
      ? getContractAttachmentLink(region as keyof typeof POLICY_ATTACHMENT_CID_BY_REGION)
      : '';
  console.log('contractAttachmentLink', contractAttachmentLink);
  console.log('region', region);

  const template = generatePermissionsSACDTemplate({
    grantor: walletAddress,
    grantee: clientId,
    asset: 'did:',
    permissions: createPermissionsObject(permissions || ''),
    attachments: [],
    expiration: expirationDate,
  });
  console.log('template', template);

  return template;
};
