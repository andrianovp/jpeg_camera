import Snapshot from './snapshot';

export const isCanvasSupported = () => (!!document.createElement('canvas').getContext);

// Helper for setting prefixed CSS declarations.
//
// @nodoc
// @private
export const addPrefixedStyle = (theElement, style, value) => {
  const element = theElement;
  const uppercaseStyle = style.charAt(0).toUpperCase() + style.slice(1);
  element.style[style] = value;
  element.style[`Webkit${uppercaseStyle}`] = value;
  element.style[`Moz${uppercaseStyle}`] = value;
  element.style[`ms${uppercaseStyle}`] = value;
  element.style[`O${uppercaseStyle}`] = value;

  return element;
};

// Base class for JpegCamera implementations. Subclasses provide functionality
// defined by this API using different engines. On supported browsers HTML5
// implementation will be used, otherwise Flash will be used if available.
export default class JpegCameraBase {
  // @nodoc
  // @private
  defaultOptions = {
    shutterOggUrl: null,
    shutterMp3Url: null,
    swfUrl: null,
    onDebug(message) {
      // eslint-disable-next-line no-console
      if (console && console.log) { return console.log(`JpegCamera: ${message}`); }
      return null;
    },
    resolution: 3840,
    quality: 0.9,
    shutter: true,
    mirror: false,
    previewMirror: true,
    scale: 1.0,
    accessMessage:
      'Please allow camera access when prompted by the browser.<br><br>' +
      'Look for camera icon around your address bar.',
  };

  // @nodoc
  // @private
  isReady = false;

  // @nodoc
  // @private
  errorOccured = false;

  // @nodoc
  // @private
  statsCaptureScale = 0.2;

  // @nodoc
  // @private
  snapshots = {};

  // @nodoc
  // @private
  displayedSnapshot = null;

  // @nodoc
  // @private
  overlay = null;

  // @nodoc
  // @private
  viewWidth = null;

  // @nodoc
  // @private
  viewHeight = null;

  // Tells whether the browser supports `canvas` element and you can use
  // {Snapshot#getCanvas} method to display snapshots outside the camera
  // container.
  //
  // All browsers except Internet Explorer 8 and earlier support `canvas`
  // element.
  //
  // @return [Boolean] True if `canvas` is supported.
  canvasSupported() {
    return isCanvasSupported();
  }

  // Construct new camera.
  //
  // JpegCamera will fill the entire container element. If the element's aspect
  // ratio is different than that of the camera stream (usually 4:3, but
  // sometimes 16:9) the stream will be clipped horizontally or vertically.
  //
  // To display the image on the client side the image might additionally get
  // resized to match container element, but the file sent to the server will
  // always be in camera's native resolution.
  //
  // By design the file sent to the server will only contain the area that was
  // visible to the user during capture. There is no way of sending unclipped,
  // full camera frame without showing the whole frame to the user.
  //
  // Resizing container after the camera has been initialized is not supported.
  //
  // Various options provided here can be overwritten when calling
  // {JpegCamera#capture capture} or {Snapshot#upload}.
  //
  // @param container [DOMElement, String] DOM element or element's ID.
  //
  // @option options swfUrl [String] URL to the SWF file that should be used
  //   for fallback if HTML5 cannot be used. '/jpeg_camera/jpeg_camera.swf' by
  //   default.
  // @option options shutterMp3Url [String] URL to the shutter mp3 sound file.
  //   Used by flash. '/jpeg_camera/shutter.mp3' by default.
  // @option options shutterOggUrl [String] URL to the shutter ogg sound file.
  //   Used by HTML5. '/jpeg_camera/shutter.ogg' by default.
  // @option options onReady [Function] Function to call when camera is ready.
  //   Inside the callback camera object can be accessed as `this`. This
  //   function will receive object with `videoWidth` and `videoHeight`
  //   properties as the first argument. These indicate camera's native
  //   resolution. See also {JpegCamera#ready}.
  // @option options onDebug [Function] This callback can be used to log various
  //   events and information that can be useful when debugging JpegCamera. Debug
  //   message will be passed as the first argument. Inside the callback camera
  //   object can be accessed as `this`. There is a default implementation of
  //   this callback that logs messages to window.console if available.
  // @option options resolution [Number] The horizontal resolution to ask camera for when
  //   initialising. Camera will be initialised at closest allowed horizontal resolution.
  // @option options quality [Float] Quality of the JPEG file that will be
  //   uploaded to the server. Should be between 0 and 1. 0.9 by default. Can be
  //   overwritten when calling {JpegCamera#capture capture}. _Cannot_ be
  //   overwritten at the time of upload.
  // @option options mirror [Boolean] The video stream and images displayed on
  //   the client side mimic a mirror, because that's how people are used to
  //   seeing themselves. By default images are uploaded to the server in their
  //   natural orientation - how the front facing camera sees the user.
  //   This option can be set to true to upload images the way the user sees
  //   them. Can be overwritten when calling {JpegCamera#capture capture}.
  //   _Cannot_ be overwritten at the time of upload.
  // @option options shutter [Boolean] Whether to play shutter sound when
  //   capturing snapshots. Can be overwritten when calling
  //   {JpegCamera#capture capture}.
  constructor(theContainer, options) {
    let container = theContainer;
    if (typeof container === 'string') {
      container = document.getElementById(container.replace('#', ''));
    }

    if (!container || !container.offsetWidth) {
      throw new Error('JpegCamera: invalid container');
    }

    container.innerHTML = '';
    this.viewWidth = parseInt(container.offsetWidth, 10);
    this.viewHeight = parseInt(container.offsetHeight, 10);

    this.container = document.createElement('div');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.position = 'relative';

    container.appendChild(this.container);

    this.options = Object.assign({}, this.defaultOptions, options);
  }

  resize(containerWidth, containerHeight) {
    this.viewWidth = parseInt(containerWidth, 10);
    this.viewHeight = parseInt(containerHeight, 10);
    this.resizePreview();
    return this;
  }

  // Bind callback for camera ready event.
  //
  // Replaces the callback set using __onReady__ option during initialization.
  //
  // If the event has already happened the argument will be called immediately.
  //
  // @param callback [Function] function to call when camera is ready. Camera
  //   object will be available as `this`. This function will receive object with
  //   `videoWidth` and `videoHeight` properties as the first argument. These
  //   indicate camera's native resolution.
  //
  // @return [JpegCameraBase] Self for chaining.
  ready(callback) {
    this.options.onReady = callback;
    if (this.options.onReady && this.isReady) {
      this.options.onReady.call(this, {
        videoWidth: this.videoWidth,
        videoHeight: this.videoHeight,
      });
    }
    return this;
  }

  // Peak into video stream and calculate pixel statistics.
  //
  // Can be useful to give the user hints about bad lighting. It uses full
  // capture area, but at much lower resolution. It's more efficient than taking
  // a regular capture and calling {Snapshot#getStats}.
  //
  // Because reading image data can take a while when Flash fallback is being
  // used this method does not return the data immediately. Instead it accepts
  // a callback that later will be called with a {Stats} instance as an argument.
  // The camera object will be available as `this`.
  //
  // @param callback [Function] Function to call when data is available. Camera
  //   object will be available as `this`, the {Stats} instance will be passed
  //   as the first argument.
  //
  // @return [void]
  getStats(callback) {
    const snapshot = new Snapshot(this, {});

    this.engineCapture(snapshot, false, 0.1, this.statsCaptureScale);

    const that = this;
    return snapshot.getStats(stats => callback.call(that, stats));
  }

  // Capture camera snapshot.
  //
  // All of the options can have their defaults set when constructing camera
  // object.
  //
  // @option options quality [Float] Quality of the JPEG file that will be
  //   uploaded to the server. Should be between 0 and 1. Defaults to 0.9 or
  //   whatever was set during camera initialization. _Cannot_ be
  //   overwritten at the time of upload.
  // @option options mirror [Boolean] The video stream and images displayed on
  //   the client side mimic a mirror, because that's how people are used to
  //   seeing themselves. By default images are uploaded to the server in their
  //   natural orientation - how the front facing camera sees the user.
  //   This option can be set to true to upload images the way the user sees
  //   them. _Cannot_ be overwritten at the time of upload.
  // @option options scale [Float] By default snapshots are captured and uploaded
  //   using highest possible resolution. Set this to a number less than 1.0 to
  //   get smaller snapshots.
  // @option options shutter [Boolean] Whether to play the shutter sound.
  //
  // @return [Snapshot] The snapshot that was taken.
  capture(newOptions) {
    let options = Object.assign({}, this.options);
    if (newOptions) {
      options = Object.assign({}, options, newOptions);
    }
    const snapshot = new Snapshot(this, options);
    this.snapshots[snapshot.id] = snapshot;

    if (options.shutter) {
      this.enginePlayShutterSound();
    }

    let scale = Math.min(1.0, options.scale);
    scale = Math.max(0.01, scale);

    this.engineCapture(snapshot, options.mirror, options.quality, scale);

    return snapshot;
  }

  // Hide currently displayed snapshot and show the video stream.
  //
  // @return [JpegCameraBase] Self for chaining.
  showStream() {
    this.engineShowStream();
    this.displayedSnapshot = null;
    return this;
  }

  // Discard all snapshots and show video stream.
  //
  // @return [JpegCameraBase] Self for chaining.
  discardAll() {
    if (this.displayedSnapshot) {
      this.showStream();
    }
    Object.keys(this.spanshots).map((id) => {
      const snapshot = this.snapshots[id];
      this.engineDiscard(snapshot);
      snapshot.discarded = true;
      return null;
    });
    this.snapshots = {};
    return this;
  }

  // Log debug messages
  //
  // @nodoc
  // @private
  debug(message) {
    if (this.options.onDebug) { return this.options.onDebug.call(this, message); }
    return null;
  }

  // @nodoc
  // @private
  display(snapshot) {
    this.engineDisplay(snapshot);
    this.displayedSnapshot = snapshot;
    return this.displayedSnapshot;
  }

  // @nodoc
  // @private
  discard(snapshot) {
    if (this.displayedSnapshot === snapshot) {
      this.showStream();
    }
    this.engineDiscard(snapshot);
    // eslint-disable-next-line no-param-reassign
    snapshot.discarded = true;
    return delete this.snapshots[snapshot.id];
  }

  // Called by the engine when camera is ready.
  //
  // @nodoc
  // @private
  prepared(videoWidth, videoHeight) {
    this.videoWidth = videoWidth;
    this.videoHeight = videoHeight;

    // XXX Since this method is called from inside the Flash object, we need to
    // return control to make flash object usable again.
    const that = this;
    return setTimeout((() => that.waitUntilStreamLooksOk(true)), 1);
  }

  // This peaks into the video stream using very small rendering and calculates
  // colors mean value and standard deviation. If standard deviation is
  // negligible then we assume camera isn't ready yet and wait a little longer.
  //
  // @nodoc
  // @private
  waitUntilStreamLooksOk(showDebug) {
    return this.getStats((stats) => {
      if (stats.std > 2) {
        this.debug(`Stream mean gray value = ${stats.mean} standard deviation = ${stats.std}`);
        this.debug('Camera is ready');

        this.isReady = true;
        if (this.options.onReady) {
          return this.options.onReady.call(this, {
            videoWidth: this.videoWidth,
            videoHeight: this.videoHeight,
          });
        }
      } else {
        if (showDebug) {
          this.debug(`Stream mean gray value = ${stats.mean} standard deviation = ${stats.std}`);
        }
        const that = this;
        return setTimeout((() => that.waitUntilStreamLooksOk(false)), 100);
      }

      return null;
    });
  }

  // Shows an overlay over the container to block mouse access.
  //
  // Prevents changing flash permission after camera has been enabled or stopping
  // the HTML5 video stream - both options available through context menu of
  // Flash object or <video> elements.
  //
  // @nodoc
  // @private
  blockElementAccess() {
    this.overlay = document.createElement('div');
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = 0;
    this.overlay.style.left = 0;
    this.overlay.style.zIndex = 2;

    return this.container.appendChild(this.overlay);
  }
}
