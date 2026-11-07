import type { HtmlTagDescriptor, Plugin } from 'vite';

/**
 * A preload link for each built file whose name matches, in input order. The
 * browser otherwise finds a font only after the JavaScript renders text that
 * uses it. Fonts are fetched in CORS mode even from the same origin, so the
 * link needs `crossorigin` or the preloaded file goes unused.
 */
export const fontPreloadTags = (
  fileNames: string[],
  match: RegExp,
): HtmlTagDescriptor[] =>
  fileNames
    .filter((fileName) => match.test(fileName))
    .map((fileName) => ({
      tag: 'link',
      attrs: {
        rel: 'preload',
        href: '/' + fileName,
        as: 'font',
        type: 'font/woff2',
        crossorigin: '',
      },
      injectTo: 'head',
    }));

/** Preloads the built fonts matching `match` from index.html. */
export const fontPreload = (match: RegExp): Plugin => ({
  name: 'font-preload',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, ctx) => fontPreloadTags(Object.keys(ctx.bundle ?? {}), match),
  },
});
