import { ValidationFunction } from '../hooks/useErrorHandler';
import { message } from '../i18n';
import { isEmbed } from '../utils/isEmbed';

/**
 * The connected-apps page revokes access, and embedded the browser keeps a
 * separate store per embedding site, so it only opens in its own window: a
 * popup or a tab. Refused before anyone signs in.
 */
const notEmbedded: ValidationFunction = () =>
  isEmbed()
    ? {
        isValid: false,
        error: { title: message('apps.title'), message: message('apps.embedded') },
      }
    : { isValid: true };

export const connectedAppsValidations = { notEmbedded };
