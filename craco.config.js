const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fix for wormhole SDK ESM module resolution
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Add resolve extensions
      webpackConfig.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx'],
        '.mjs': ['.mjs', '.mts'],
      };

      // Ignore missing optional dependencies from Wormhole SDK
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Critical dependency: the request of a dependency is an expression/,
      ];

      // Add fallbacks for node modules that aren't available in browser
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
      };

      // Provide global Buffer and process for libraries that need them
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // Ignore Wormhole Solana NTT SDK since we don't use it
      // This package has broken imports that we don't need
      webpackConfig.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /@wormhole-foundation\/sdk-solana-ntt/,
        })
      );

      return webpackConfig;
    },
  },
};
