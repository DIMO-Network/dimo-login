import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { entryGuard, FIRST_SCREEN_FORBIDDEN } from './vite-plugins/entryGuard.mts';
import { fontPreload } from './vite-plugins/fontPreload.mts';

/**
 * The app reads its settings as `process.env.REACT_APP_*`, the Create React
 * App convention, and Vercel injects them (plus `REACT_APP_VERCEL_*`) under
 * that prefix. Each one set at build time is inlined; a name that isn't set
 * reads as undefined, as it did under CRA. Tests run in Node, where
 * `process.env` is real, so nothing is inlined there.
 *
 * Source maps are built only when SENTRY_AUTH_TOKEN is set, so the
 * `sentry:sourcemaps` step can upload them. They're built hidden (no
 * sourceMappingURL comment in the bundles) and that step deletes them after
 * the upload, so they reach Sentry and not the public, as the console does
 * (#313).
 *
 * NODE_ENV follows the command, as `react-scripts build` and `start` set it,
 * so a build in any `--mode` still ships React's production build. It's set on
 * process.env, not only defined: Vite reads it after this config to decide
 * isProduction, and @vitejs/plugin-react picks the JSX runtime from that. A
 * NODE_ENV=development left in the shell or in Vercel's settings would otherwise
 * emit jsxDEV calls against React's production build, which has no jsxDEV.
 */
export default defineConfig(({ command, mode }) => {
  const nodeEnv = command === 'build' ? 'production' : 'development';
  if (!process.env.VITEST) process.env.NODE_ENV = nodeEnv;
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const inlined = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      `process.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    plugins: [
      react(),
      tailwindcss(),
      // The first screen's JavaScript: no wallet code, and a size budget.
      entryGuard({ forbidden: FIRST_SCREEN_FORBIDDEN, maxGzipKiB: 171 }),
      // The first screen uses Regular, Medium and Semibold; Bold isn't preloaded.
      fontPreload(/assets\/EuclidCircularA-(Regular|Medium|Semibold)-[\w-]+\.woff2$/),
    ],
    envPrefix: 'REACT_APP_',
    define: process.env.VITEST
      ? {}
      : {
          ...inlined,
          'process.env.NODE_ENV': JSON.stringify(nodeEnv),
          'process.env': '{}',
        },
    // The README's Tesla redirect URI names port 3000, so fail rather than
    // move to another port when it's taken.
    server: { port: 3000, strictPort: true },
    build: {
      outDir: 'build',
      sourcemap: process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/setupTests.ts'],
      // As CRA's Jest config did (resetMocks): mocks are reset before each
      // test, so one test's mockResolvedValue can't satisfy the next.
      mockReset: true,
      // @uniswap/sdk-core's ESM build (pulled in by the transactions SDK) uses
      // extensionless imports that Node can't resolve, so Vite resolves them.
      server: { deps: { inline: ['@dimo-network/transactions', '@uniswap/sdk-core'] } },
    },
  };
});
