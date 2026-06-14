/**
 * CRACO config — the only customization is suppressing a single benign webpack
 * warning from a transitive dependency so the production build doesn't fail.
 *
 * A dependency in the tree (Sentry/OpenTelemetry-style instrumentation pulled in
 * via require-in-the-middle) uses a dynamic `require(expression)`, which webpack
 * reports as "Critical dependency: the request of a dependency is an expression."
 * It's harmless for the browser bundle, but Create React App escalates any build
 * warning to a fatal error when CI=true (as on Vercel). We ignore just this one
 * message and keep warning-as-error on for everything else (our own code).
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
};
