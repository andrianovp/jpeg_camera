This project is based on [Adam Wróbel](http://adamwrobel.com)
[JpegCamera](https://github.com/amw/jpeg_camera) library.

*Notes on changes:*
> The project was rewritten into ES6 JS and modified. The purpose of this library is to be used in larger ES6-based
> projects, therefore the AJAX upload functionality was removed from the original source.
> The license stays the same and is located in LICENSE.md file.

## About

JpegCamera is a JavaScript library that allows you to display a camera stream on a web page and then capture JPEG snapshots. It uses HTML5 in Chrome, Firefox, Safari and Opera and falls back to Flash in less capable browsers. The video stream is placed without any UI in a container of your choice and you control it through JavaScript API and your own UI elements.

The idea is based on a similar JpegCam library which was Flash only. Beside working without Flash and offering a cleaner, more modern API, JpegCamera has some nice, new features.

## Features

- Works natively in Chrome, Firefox, Safari, Opera and with a Flash plugin in all other
  browsers.
- Configurable resolution to try to initialize (by defaults it is asking for 4K and gets the closest possible)
- You can get snapshots for display outside the camera container in browsers
  that support `canvas` element - even when using Flash fallback.
- Makes sure the camera is really ready by checking stream's color standard
  deviation. Safeguard from weird all-black or all-white snapshots.

## Dependencies

- [Canvas-to-Blob](https://github.com/blueimp/JavaScript-Canvas-to-Blob) polyfill for the standard JavaScript `canvas.toBlob` method.
- [SWFObject](http://code.google.com/p/swfobject/) for embedding the Flash-based fallback.

These scripts are *not* packaged with jpeg_camera.js module.

## Usage

Import the dependencies and then the main module.

Example using webpack's script-loader:
```
import JpegCameraSwf from 'jpeg-camera-es6/lib/jpeg_camera.swf';
import 'script-loader!jpeg-camera-es6/lib/swfobject.min.js';
import 'script-loader!jpeg-camera-es6/lib/canvas-to-blob.min.js';

import JpegCamera from 'jpeg-camera-es6';
```

Of course your webpack needs to know how to handle the .swf file and you need script-loader package installed.

The example usage:
```
import JpegCameraSwf from 'jpeg-camera-es6/lib/jpeg_camera.swf';
import 'script-loader!jpeg-camera-es6/lib/swfobject.min.js';
import 'script-loader!jpeg-camera-es6/lib/canvas-to-blob.min.js';

import JpegCamera from 'jpeg-camera-es6';

const theWebcam = null;
const theContainer = document.getElementById('the-webcam-container-id')

JpegCamera(
  theContainer,
  {
    swfUrl: JpegCameraSwf,
    onInit: (webcam) => {
      // here you can do some initialisation if required.
      // save the module reference so we can call it
      theWebcam = webcam;
    },
    onReady: (specs) => { /* do something when camera is ready */ },
    onError: (err) => { /* do something when there's an error */ },
    onDebug: (debug) => { console.log(debug); },
    shutter: false,
    mirror: false,
    previewMirror: false,
  }
);
```

Then use the `theWebcam.capture()` to grab the picture blob.

Take a look into https://github.com/CurrencyFair/jpeg_camera/blob/master/src/jpeg_camera.js to see all the available
config options and methods. There's plenty of docblocks in there to read.

## Caveats

To use Flash fallback your camera container must be at least 215 pixels wide and
138 pixels tall. This is the minimum to display privacy settings dialog.

The Flash will display a security dialog in older browsers (e.g. IE 11), so remember *not to cover*
the middle of the container with any other element (e.g. transparent div with some message or something).

## Contributing

The source code is available on [Github](https://github.com/CurrencyFair/jpeg_camera). The code (and a large part of this readme)
is forked from https://github.com/CurrencyFair/jpeg_camera but that projects seems not to be updated anymore.

## Building

Get [Webpack](https://webpack.github.io/) and run it in the project folder to generate dist version of the library.

## Acknowledgements
Thanks to [Adam Wróbel](http://adamwrobel.com) for developing the original version of this library.
Thanks to Joseph Huckaby for creating and Matt Clements for maintaining
Flash-based [JpegCam library](http://code.google.com/p/jpegcam/) which I have
been using until HTML5 became a viable solution. If you're interested here's
[Matt's repo](https://github.com/mattclements/jpegcam).
Thanks to everyone else contributing to that project.
