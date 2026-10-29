/**
 * CRACO config — two small customizations on top of Create React App.
 *
 * Webpack: suppress a single benign warning from a transitive dependency so the
 * production build doesn't fail. A dependency in the tree (Sentry/OpenTelemetry-
 * style instrumentation pulled in via require-in-the-middle) uses a dynamic
 * `require(expression)`, which webpack reports as "Critical dependency: the
 * request of a dependency is an expression." It's harmless for the browser
 * bundle, but Create React App escalates any build warning to a fatal error when
 * CI=true (as on Vercel). We ignore just this one message and keep
 * warning-as-error on for everything else (our own code).
 *
 * Jest: CRA's Jest 27 can't resolve package `exports` subpaths, and
 * @turnkey/crypto (through @peculiar/x509) requires `@peculiar/utils/bytes` and
 * `@peculiar/utils/encoding`, which exist only there. Point them at the
 * CommonJS builds. Webpack resolves `exports` itself, so the app is unaffected.
 */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        /Critical dependency: the request of a dependency is an expression/,
      ];
      return webpackConfig;
    },
  },
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
