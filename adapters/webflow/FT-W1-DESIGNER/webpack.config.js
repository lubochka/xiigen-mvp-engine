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
  target: 'web',
  externals: {
    '@webflow/designer-extension-typings': 'webflowDesignerExtensionTypings',
  },
};
