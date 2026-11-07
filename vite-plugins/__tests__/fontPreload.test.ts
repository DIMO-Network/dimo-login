import { fontPreloadTags } from '../fontPreload.mts';

const match = /assets\/EuclidCircularA-(Regular|Medium|Semibold)-[\w-]+\.woff2$/;

describe('fontPreloadTags', () => {
  it('preloads the matching fonts, cross-origin, as woff2', () => {
    const tags = fontPreloadTags(
      [
        'assets/EuclidCircularA-Regular-abc.woff2',
        'assets/EuclidCircularA-Bold-def.woff2',
        'assets/index-1.js',
      ],
      match,
    );

    expect(tags).toEqual([
      {
        tag: 'link',
        attrs: {
          rel: 'preload',
          href: '/assets/EuclidCircularA-Regular-abc.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: '',
        },
        injectTo: 'head',
      },
    ]);
  });

  it('preloads nothing when no font matches', () => {
    expect(fontPreloadTags(['assets/index-1.js'], match)).toEqual([]);
  });
});
