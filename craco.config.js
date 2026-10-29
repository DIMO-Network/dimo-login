/**
 * CRACO config — used only for `npm test` until the tests move off CRA's Jest.
 *
 * CRA's Jest 27 can't resolve package `exports` subpaths, and
 * @turnkey/crypto (through @peculiar/x509) requires `@peculiar/utils/bytes` and
 * `@peculiar/utils/encoding`, which exist only there. Point them at the
 * CommonJS builds.
 */
module.exports = {
  jest: {
    configure: (jestConfig) => ({
      ...jestConfig,
      moduleNameMapper: {
        ...jestConfig.moduleNameMapper,
        '^@peculiar/utils/(bytes|encoding)$':
          '<rootDir>/node_modules/@peculiar/utils/build/cjs/$1/index.js',
      },
    }),
  },
};
