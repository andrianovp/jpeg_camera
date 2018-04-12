const path = require('path');
const { exec } = require('child_process');
const WebpackShellPlugin = require('webpack-shell-plugin');
const FilewatcherPlugin = require('filewatcher-webpack-plugin');

const flexBuildCmd = 'node_modules/.bin/mxmlc -static-link-runtime-shared-libraries -output lib/jpeg_camera.swf src/as3/JpegCamera.as';

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'jpeg_camera.js',
    library: 'JpegCamera',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['es2015'],
            plugins: ['transform-class-properties'],
          },
        }],
      },
    ],
  },
  plugins: [
    new WebpackShellPlugin({
      onBuildEnd: [flexBuildCmd],
    }),
    new FilewatcherPlugin({
      watchFileRegex: [
        'src/as3/*.as',
      ],
      onChangeCallback: () => {
        process.stdout.write('Rebuilding AS3 sources\n');
        exec(flexBuildCmd, (e, stdout, stderr) => {
          process.stdout.write(stdout);
          process.stderr.write(stderr);
        });
      },
    }),
  ],
};
