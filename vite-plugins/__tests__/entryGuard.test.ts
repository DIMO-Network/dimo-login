import { gzipSync } from 'zlib';
import type { Rolldown } from 'vite';

import { entryGuard, firstLoadBytes, forbiddenEntryModules } from '../entryGuard';

// The patterns vite.config.mts passes.
const forbidden = [
  /node_modules\/(viem|@turnkey|@zerodev|@peculiar|@uniswap|i18n-iso-countries)\//,
  /node_modules\/@dimo-network\/transactions\/dist\/(?!core\/types\/)/,
  /\/src\/services\/(turnkeyService|signInSteps)\.ts$/,
];

type ChunkSpec = {
  isEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  /** Module id → renderedLength. */
  modules?: Record<string, number>;
  code?: string;
};

const chunk = (fileName: string, spec: ChunkSpec) => ({
  type: 'chunk' as const,
  fileName,
  isEntry: spec.isEntry ?? false,
  imports: spec.imports ?? [],
  dynamicImports: spec.dynamicImports ?? [],
  code: spec.code ?? '',
  modules: Object.fromEntries(
    Object.entries(spec.modules ?? {}).map(([id, renderedLength]) => [
      id,
      { code: null, renderedLength, renderedExports: [] },
    ]),
  ),
});

const bundleOf = (chunks: Record<string, ChunkSpec>) =>
  Object.fromEntries(
    Object.entries(chunks).map(([fileName, spec]) => [fileName, chunk(fileName, spec)]),
  ) as unknown as Rolldown.OutputBundle;

const app = (entryModules: Record<string, number> = {}) =>
  bundleOf({
    'index.js': {
      isEntry: true,
      imports: ['shared.js'],
      dynamicImports: ['lazy.js'],
      modules: { '/x/src/index.tsx': 10, ...entryModules },
      code: 'import "./shared.js"; console.log("first screen");',
    },
    'shared.js': {
      modules: { '/x/node_modules/viem/a.js': 10 },
      code: 'export const a = 1;',
    },
    'lazy.js': {
      imports: ['lazy-dep.js'],
      modules: { '/x/node_modules/@turnkey/http/b.js': 10 },
      code: 'export const b = 2;',
    },
    'lazy-dep.js': {
      modules: { '/x/node_modules/@zerodev/sdk/c.js': 10 },
      code: 'export const c = 3;',
    },
  });

describe('forbiddenEntryModules', () => {
  it('reports wallet code the first screen imports statically', () => {
    expect(forbiddenEntryModules(app(), forbidden)).toEqual([
      '/x/node_modules/viem/a.js',
    ]);
  });

  it('ignores lazy chunks', () => {
    const bundle = bundleOf({
      'index.js': { isEntry: true, dynamicImports: ['lazy.js'] },
      'lazy.js': {
        imports: ['lazy-dep.js'],
        modules: { '/x/node_modules/@turnkey/http/b.js': 10 },
      },
      'lazy-dep.js': { modules: { '/x/src/services/turnkeyService.ts': 10 } },
    });
    expect(forbiddenEntryModules(bundle, forbidden)).toEqual([]);
  });

  it('allows the Permission enum', () => {
    const bundle = app({
      '/x/node_modules/@dimo-network/transactions/dist/core/types/args.js': 10,
      '/x/node_modules/@dimo-network/transactions/dist/index.js': 10,
    });
    expect(forbiddenEntryModules(bundle, forbidden)).toEqual([
      '/x/node_modules/@dimo-network/transactions/dist/index.js',
      '/x/node_modules/viem/a.js',
    ]);
  });

  it('ignores modules that render nothing', () => {
    const bundle = app({ '/x/node_modules/@peculiar/asn1/d.js': 0 });
    expect(forbiddenEntryModules(bundle, forbidden)).toEqual([
      '/x/node_modules/viem/a.js',
    ]);
  });
});

describe('firstLoadBytes', () => {
  it('measures the entry and the chunks it imports statically', () => {
    const entry = 'import "./shared.js"; console.log("first screen");';
    const shared = 'export const a = 1;';
    expect(firstLoadBytes(app())).toEqual({
      raw: Buffer.byteLength(entry) + Buffer.byteLength(shared),
      gzip: gzipSync(entry).length + gzipSync(shared).length,
    });
  });
});

describe('entryGuard', () => {
  const runGuard = (
    options: { forbidden: RegExp[]; maxGzipKb: number },
    bundle = app(),
  ) => {
    const error = vi.fn();
    const info = vi.fn();
    const plugin = entryGuard(options);
    const generateBundle = plugin.generateBundle as (
      this: unknown,
      outputOptions: unknown,
      bundle: Rolldown.OutputBundle,
      isWrite: boolean,
    ) => void;
    generateBundle.call({ error, info }, {}, bundle, true);
    return { plugin, error, info };
  };

  it('runs only in builds and reports the first-load size', () => {
    const { plugin, error, info } = runGuard({ forbidden: [], maxGzipKb: 100 });
    expect(plugin.apply).toBe('build');
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/^first-load JS: [\d.]+ KB, [\d.]+ KB gzipped$/),
    );
    expect(error).not.toHaveBeenCalled();
  });

  it('fails the build when wallet code reaches the first screen', () => {
    const { error } = runGuard({ forbidden, maxGzipKb: 100 });
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('/x/node_modules/viem/a.js'),
    );
  });

  it('names the app module to fix before the packages it reaches', () => {
    const root = process.cwd();
    const bundle = bundleOf({
      'index.js': {
        isEntry: true,
        modules: {
          [`${root}/node_modules/viem/a.js`]: 10,
          [`${root}/src/services/turnkeyService.ts`]: 10,
        },
      },
    });
    const { error } = runGuard({ forbidden, maxGzipKb: 100 }, bundle);
    expect(error.mock.calls[0][0].split('\n').slice(1, 3)).toEqual([
      '  src/services/turnkeyService.ts',
      '  node_modules/viem/a.js',
    ]);
  });

  it('fails the build when the first screen is over budget', () => {
    const { error } = runGuard({ forbidden: [], maxGzipKb: 0 });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('over the 0 KB budget'));
  });
});
