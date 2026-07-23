/**
 * C5 Canva Text Elements Adapter — webpack config
 *
 * IMPORTANT: webpack is MANDATORY for Canva Apps SDK.
 * Canva sandbox constraint: Vite, Rollup, and esbuild are NOT supported.
 * Reference: CANVA_APP_DECLARATION.constraints in stack-capability-declaration.ts
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
  },
  // Canva sandbox — web target, no Node.js built-ins
  target: 'web',
  // Externalize Canva SDK — provided by the Canva runtime
  externals: {
    '@canva/design': 'canvaDesign',
    '@canva/app-ui-kit': 'canvaAppUiKit',
    '@canva/app-storage': 'canvaAppStorage',
  },
};
