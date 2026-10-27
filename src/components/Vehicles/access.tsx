import React from 'react';
import { Permission } from '@dimo-network/transactions';
import {
  ChartBarIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  IdentificationIcon,
  MapIcon,
  MapPinIcon,
  PhotoIcon,
  ShieldCheckIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

import { CloudEventAgreement } from '../../types';
import { PermissionKey } from '../../types/permissions';
import { getAgreementLabelKey } from '../../services/vehicleDocumentAgreements';
import { permissionKey } from '../../utils/permissions';
import type { TranslationKey } from '../../i18n';

type Icon = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

/** One thing a share gives the app, as the request card and terms sheet show it. */
export interface AccessItem {
  id: string;
  label: string;
  description: string;
  Icon: Icon;
  /** Said next to the label for access that can act on the vehicle. */
  caution?: string;
  /** Requested now but not in the vehicle's current grant. */
  isNew?: boolean;
}

const PERMISSION_ICONS: Record<PermissionKey, Icon> = {
  GetNonLocationHistory: ChartBarIcon,
  ExecuteCommands: ExclamationTriangleIcon,
  GetCurrentLocation: MapPinIcon,
  GetLocationHistory: MapIcon,
  GetVINCredential: ShieldCheckIcon,
  GetLiveData: SignalIcon,
  GetRawData: CodeBracketIcon,
  GetApproximateLocation: GlobeAltIcon,
};

const DOCUMENT_ICONS: Partial<Record<TranslationKey, Icon>> = {
  'document.driver': IdentificationIcon,
  'document.raw_vehicle': PhotoIcon,
  'document.raw_driver': PhotoIcon,
};

export const permissionItem = (
  permission: Permission,
  t: Translate,
  isNew = false,
): AccessItem => {
  const key = permissionKey(permission);
  if (!key) {
    return {
      id: `permission-${permission}`,
      label: t('permission.unknown.label', { id: permission }),
      description: '',
      Icon: ShieldCheckIcon,
      isNew,
    };
  }
  return {
    id: `permission-${key}`,
    label: t(`permission.${key}.label` as TranslationKey),
    description: t(`permission.${key}.description` as TranslationKey),
    Icon: PERMISSION_ICONS[key] ?? ShieldCheckIcon,
    caution:
      key === 'ExecuteCommands' ? t('permission.ExecuteCommands.caution') : undefined,
    isNew,
  };
};

/** One item per kind of document, however many agreements name it. */
export const fileItems = (
  agreements: CloudEventAgreement[],
  t: Translate,
  isNew = false,
): AccessItem[] =>
  Array.from(new Set(agreements.map(getAgreementLabelKey))).map((labelKey) => ({
    id: `file-${labelKey}`,
    label: t(labelKey),
    description:
      labelKey === 'document.other' ? '' : t(`${labelKey}.description` as TranslationKey),
    Icon: DOCUMENT_ICONS[labelKey] ?? DocumentTextIcon,
    isNew,
  }));
