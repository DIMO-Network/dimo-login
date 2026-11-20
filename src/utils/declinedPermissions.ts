import type { Permission } from '@dimo-network/transactions';

/**
 * What the user switched off on the request card: permissions, and kinds of
 * document by their label key (see getAgreementLabelKey). Left out of new
 * shares and taken off shares that have them.
 */
export interface Declined {
  permissions: Permission[];
  files: string[];
}

export const NOTHING_DECLINED: Declined = { permissions: [], files: [] };

export const isDeclining = (declined: Declined) =>
  declined.permissions.length > 0 || declined.files.length > 0;

/**
 * Kept outside the screen so the choice survives Manage and Add vehicle, which
 * unmount it. Keyed by the request, so another request starts with everything
 * on; cleared once the flow ends. A full page load (an OAuth return) starts
 * over with everything on, which shows on the card.
 */
let saved: { key: string; declined: Declined } | undefined;

export const requestKey = (
  clientId: string | null | undefined,
  permissions?: string,
  permissionTemplateId?: string,
) => [clientId ?? '', permissions ?? '', permissionTemplateId ?? ''].join('|');

export const loadDeclined = (key: string): Declined =>
  saved?.key === key ? saved.declined : NOTHING_DECLINED;

export const saveDeclined = (key: string, declined: Declined) => {
  saved = isDeclining(declined) ? { key, declined } : undefined;
};

export const clearDeclined = () => {
  saved = undefined;
};
