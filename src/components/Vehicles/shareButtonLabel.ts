import { t as translate } from '../../i18n';

/**
 * Name the button after what it will do: share new vehicles, update shares
 * made with older terms, or both ("Share 1 · Update 2").
 */
export const getShareButtonLabel = (
  shareCount: number,
  updateCount: number,
  t: typeof translate = translate,
) => {
  if (shareCount && updateCount)
    return t('share.cta.mixed', { share: shareCount, update: updateCount });
  if (updateCount) return t('share.cta.update', { count: updateCount });
  if (shareCount) return t('share.cta.share', { count: shareCount });
  return t('share.cta.select');
};
