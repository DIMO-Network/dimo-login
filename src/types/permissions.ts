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

// Labels, descriptions and contract wording for each permission live in
// i18n/locales under `permission.<key>.*` and `contract.permission.<key>`.

export type Attachment = {
  name: string;
  description: string;
  contentType: string;
  url: string;
};

export type CloudEventAgreement = {
  eventType?: string;
  // Optional in the cloudEvent param; the signer defaults it to the grantor.
  source?: `0x${string}`;
  ids: string[];
  tags: string[];
};
