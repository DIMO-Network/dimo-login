import type { Permission } from '@dimo-network/transactions';

/**
 * The requested permissions the user switched off on the request card. Kept
 * outside the screen so the choice survives Manage and Add vehicle, which
 * unmount it. Keyed by the request, so another request starts with
 * everything on; cleared once the flow ends. A full page load (an OAuth
 * return) starts over with everything on, which shows on the card.
 */
let saved: { key: string; declined: Permission[] } | undefined;

export const requestKey = (
  clientId: string | null | undefined,
  permissions?: string,
  permissionTemplateId?: string,
) => [clientId ?? '', permissions ?? '', permissionTemplateId ?? ''].join('|');

export const loadDeclined = (key: string): Permission[] =>
  saved?.key === key ? saved.declined : [];

export const saveDeclined = (key: string, declined: Permission[]) => {
  saved = declined.length ? { key, declined } : undefined;
};

export const clearDeclined = () => {
  saved = undefined;
};
