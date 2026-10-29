import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The app reads its settings as `process.env.REACT_APP_*`, the Create React
 * App convention, and Vercel injects them (plus `REACT_APP_VERCEL_*`) under
 * that prefix. Each one set at build time is inlined; a name that isn't set
 * reads as undefined, as it did under CRA.
 *
 * Source maps are built only when SENTRY_AUTH_TOKEN is set, so the
 * `sentry:sourcemaps` step can upload them.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const inlined = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      `process.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    plugins: [react()],
    envPrefix: 'REACT_APP_',
    define: {
      ...inlined,
      'process.env.NODE_ENV': JSON.stringify(
        mode === 'production' ? 'production' : 'development',
      ),
      'process.env': '{}',
    },
    server: { port: 3000 },
    build: {
      outDir: 'build',
      sourcemap: Boolean(process.env.SENTRY_AUTH_TOKEN),
    },
  };
});
