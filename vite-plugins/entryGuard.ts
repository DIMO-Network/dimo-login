import { relative } from 'path';
import { gzipSync } from 'zlib';
import type { Plugin, Rolldown } from 'vite';

type OutputBundle = Rolldown.OutputBundle;
type OutputChunk = Rolldown.OutputChunk;

/**
 * The chunks a browser runs before the first screen shows: each entry and
 * every chunk reachable from it through static imports. Chunks reached only
 * through a dynamic import() load later and aren't counted.
 */
const firstLoadChunks = (bundle: OutputBundle): OutputChunk[] => {
  const chunks = new Map<string, OutputChunk>();
  const visit = (fileName: string) => {
    const output = bundle[fileName];
    if (output?.type !== 'chunk' || chunks.has(fileName)) return;
    chunks.set(fileName, output);
    output.imports.forEach(visit);
  };
  Object.values(bundle)
    .filter((output): output is OutputChunk => output.type === 'chunk' && output.isEntry)
    .forEach((entry) => visit(entry.fileName));
  return [...chunks.values()];
};

/**
 * The modules matching a forbidden pattern that the first screen loads. A
 * module tree-shaken to nothing (renderedLength 0) adds no code and is allowed.
 */
export const forbiddenEntryModules = (
  bundle: OutputBundle,
  forbidden: RegExp[],
): string[] =>
  firstLoadChunks(bundle)
    .flatMap((chunk) => Object.entries(chunk.modules))
    .filter(
      ([id, module]) =>
        module.renderedLength > 0 && forbidden.some((pattern) => pattern.test(id)),
    )
    .map(([id]) => id)
    .sort();

/** Bytes of JavaScript the first screen loads, as written and as gzip serves it. */
export const firstLoadBytes = (bundle: OutputBundle): { raw: number; gzip: number } =>
  firstLoadChunks(bundle).reduce(
    (total, { code }) => ({
      raw: total.raw + Buffer.byteLength(code),
      gzip: total.gzip + gzipSync(code).length,
    }),
    { raw: 0, gzip: 0 },
  );

const kb = (bytes: number) => (bytes / 1024).toFixed(1);

/** The app's own modules first (the import to fix), then the packages they reach. */
const listOffenders = (offenders: string[]) => {
  const inPackage = (id: string) => id.includes('/node_modules/');
  return [
    ...offenders.filter((id) => !inPackage(id)),
    ...offenders.filter(inPackage),
  ].map((id) => `  ${relative(process.cwd(), id)}`);
};

/**
 * Fails the build when the first screen's JavaScript reaches a forbidden
 * module (the wallet stack belongs behind a lazy import) or grows past
 * maxGzipKb, and prints its size either way.
 */
export const entryGuard = (options: {
  forbidden: RegExp[];
  maxGzipKb: number;
}): Plugin => ({
  name: 'entry-guard',
  apply: 'build',
  generateBundle(_outputOptions, bundle) {
    const { raw, gzip } = firstLoadBytes(bundle);
    this.info(`first-load JS: ${kb(raw)} KB, ${kb(gzip)} KB gzipped`);

    const offenders = forbiddenEntryModules(bundle, options.forbidden);
    if (offenders.length > 0) {
      this.error(
        [
          `The first screen statically imports ${offenders.length} module(s) it must load lazily:`,
          ...listOffenders(offenders),
          'Reach them through a dynamic import() (see src/screens.tsx and src/services/walletLoader.ts).',
        ].join('\n'),
      );
    }
    if (gzip / 1024 > options.maxGzipKb) {
      this.error(
        `first-load JS is ${kb(gzip)} KB gzipped, over the ${options.maxGzipKb} KB budget.`,
      );
    }
  },
});
