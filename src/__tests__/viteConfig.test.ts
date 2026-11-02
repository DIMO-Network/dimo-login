import path from 'path';
import { resolveConfig } from 'vite';

// @vitejs/plugin-react picks the JSX runtime from Vite's isProduction, which Vite
// reads from NODE_ENV after loading vite.config.mts. A build with NODE_ENV=development
// in the shell or in Vercel's settings once emitted jsxDEV calls next to React's
// production build, which has no jsxDEV: the page threw on its first render.
const configFile = path.join(__dirname, '../../vite.config.mts');

const resolveWith = async (command: 'build' | 'serve', nodeEnv: string | undefined) => {
  const saved = { NODE_ENV: process.env.NODE_ENV, VITEST: process.env.VITEST };
  // The config skips its defines under Vitest; resolve it as the CLI would, with
  // the CLI's default mode and NODE_ENV for the command.
  const cliDefault = command === 'build' ? 'production' : 'development';
  delete process.env.VITEST;
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  try {
    const config = await resolveConfig(
      { configFile, logLevel: 'silent' },
      command,
      cliDefault,
      cliDefault,
    );
    return {
      isProduction: config.isProduction,
      nodeEnv: config.define?.['process.env.NODE_ENV'],
    };
  } finally {
    process.env.NODE_ENV = saved.NODE_ENV;
    process.env.VITEST = saved.VITEST;
  }
};

describe('vite.config.mts', () => {
  it.each([undefined, 'development', 'test', 'production'])(
    'builds for production when NODE_ENV is %s',
    async (nodeEnv) => {
      expect(await resolveWith('build', nodeEnv)).toEqual({
        isProduction: true,
        nodeEnv: '"production"',
      });
    },
  );

  it.each([undefined, 'production'])(
    'serves a development build when NODE_ENV is %s',
    async (nodeEnv) => {
      expect(await resolveWith('serve', nodeEnv)).toEqual({
        isProduction: false,
        nodeEnv: '"development"',
      });
    },
  );
});
