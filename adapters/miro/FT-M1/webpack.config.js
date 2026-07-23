/**
 * FT-M1 Miro AI Architect Adapter — webpack config
 *
 * IMPORTANT: webpack is MANDATORY for Miro Apps SDK.
 * Miro Apps platform uses webpack for the sandboxed app environment.
 *
 * FLOW-34 FC-24: platform constraint documented (CLIENT_BUILD = webpack)
 */

const path = require('path');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2',
    },
    clean: true,
  },
  optimization: {
    usedExports: false,
  },
  // Web target — Miro apps run in the browser
  target: 'web',
  // Externalize Miro SDK — provided by the Miro runtime
  externals: {
    '@mirohq/miro-api': 'mirohqMiroApi',
    '@mirohq/websdk-types': 'mirohqWebSdkTypes',
  },
};
