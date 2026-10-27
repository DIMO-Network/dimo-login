import { Permission } from '@dimo-network/transactions';

import { POLICY_ATTACHMENT_CID_BY_REGION } from '../enums';
import { formatDateTimeUTC } from '../i18n/format';
import { fixedT, t, type Language, type TranslationKey } from '../i18n';
import { getAgreementLabelKey } from './vehicleDocumentAgreements';
import { Attachment, CloudEventAgreement, PERMISSIONS } from '../types';

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

type Translate = typeof t;

export const getPermissionsDescription = (
  permissions: Permission[],
  translate: Translate = t,
): string => {
  return permissions
    .map((permission) => Permission[permission])
    .filter((key): key is keyof typeof PERMISSIONS => !!key)
    .map((key) => `\n- ${translate(`contract.permission.${key}` as TranslationKey)}`)
    .join('');
};

export const getFilesRequestedString = (
  fileAgreements: CloudEventAgreement[] = [],
  translate: Translate = t,
): string => {
  // Named by what the agreement grants (its event type), not by app-supplied
  // tags, so the contract text matches what is signed.
  const labels = fileAgreements.map((agreement) => translate(getAgreementLabelKey(agreement)));
  if (!labels.length) {
    return `\n- ${translate('contract.files_none')}`;
  }

  return Array.from(new Set(labels))
    .map((label) => `\n- ${label}`)
    .join('');
};

export const getTemplateDescription = (args: {
  email: string;
  devLicenseAlias: string;
  permissions: string;
  permissionTemplateId?: string;
  fileAgreements?: CloudEventAgreement[];
  expirationDate: BigInt;
  region?: string;
  /** Defaults to the language on screen; 'en' gives the English original. */
  language?: Language;
}): string => {
  const {
    email,
    devLicenseAlias,
    permissions,
    permissionTemplateId,
    fileAgreements,
    expirationDate,
    region,
    language,
  } = args;
  const translate = language ? fixedT(language) : t;

  const perms = createPermissionsFromParams(permissions, permissionTemplateId);
  const contractAttachmentLink =
    region && region in POLICY_ATTACHMENT_CID_BY_REGION
      ? getContractAttachmentLink(region)
      : '';
  const currentTime = new Date();
  const currentTimeBigInt = BigInt(Math.floor(currentTime.getTime() / 1000));
  const permissionsString = getPermissionsDescription(perms, translate);
  const filesRequestedString = getFilesRequestedString(fileAgreements, translate);

  // ContractDescription parses this: paragraphs split on blank lines, "- "
  // lines are bullets, and only the attachment <a href> becomes a link.
  const description = [
    translate('contract.intro'),
    translate('contract.agreeing'),
    '',
    translate('contract.summary'),
    translate('contract.grantor', { email }),
    translate('contract.grantee', { appName: devLicenseAlias }),
    '',
    contractAttachmentLink,
    '',
    translate('contract.permissions', { permissions: permissionsString }),
    '',
    translate('contract.files', { files: filesRequestedString }),
    '',
    translate('contract.effective', {
      date: formatDateTimeUTC(currentTimeBigInt, language),
    }),
    translate('contract.expiration', {
      date: formatDateTimeUTC(expirationDate, language),
    }),
    '',
    translate('contract.details'),
    translate('contract.details_access'),
    translate('contract.details_template'),
    '',
    translate('contract.outro'),
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
