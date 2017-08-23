import autoBind from 'auto-bind';
import JpegCamera from './jpeg_camera';
import { WebcamError, WebcamErrors } from './errors';

//
// JpegCamera implementation that uses Flash to capture and display snapshots.
//
// @private
export default class JpegCameraFlash extends JpegCamera {
  constructor(theContainer, options) {
    super(theContainer, options);
    this.instances = {};
    this.nextId = 1;
    autoBind(this);
    this.engineInit();
  }
  // Used by flash object to send message to our instance.
  sendMessage(id, method, ...args) {
    const instance = this.instances[parseInt(id, 10)];

    if (!instance) { return null; }

    return this.prototype[method].apply(instance, ...args);
  }

  engineInit() {
    this.debug('Using Flash engine');

    // register our instance
    this.id = this.nextId++;
    this.instances[this.id] = this;

    const flashObjectId = `flash_object_${this.id}`;

    const params = {
      loop: 'false',
      allowScriptAccess: 'always',
      allowFullScreen: 'false',
      quality: 'best',
      wmode: 'opaque',
      menu: 'false',
    };
    const attributes = {
      id: flashObjectId,
      align: 'middle',
    };
    const flashvars = {
      id: this.id,
      width: this.viewWidth,
      height: this.viewHeight,
      shutter_url: this.options.shutterMp3Url,
    };
    const that = this;
    const callback = (event) => {
      if (!event.success) {
        throw new WebcamError(WebcamErrors.FLASH_FAILED_LOADING, event);
      }
      that.debug('Flash loaded.');
      that.flash = document.getElementById(flashObjectId);
      return that.flash;
    };

    const containerToBeReplaced = document.createElement('div');
    containerToBeReplaced.id = `jpeg_cameraflash_${this.id}`;
    containerToBeReplaced.style.width = '100%';
    containerToBeReplaced.style.height = '100%';

    this.container.appendChild(containerToBeReplaced);

    // eslint-disable-next-line no-undef
    return swfobject.embedSWF(
      this.options.swfUrl,
      containerToBeReplaced.id,
      this.viewWidth,
      this.viewHeight,
      '9',
      null,
      flashvars,
      params,
      attributes,
      callback,
    );
  }

  resizePreview() {
    if ((this.viewWidth < 215) || (this.viewHeight < 138)) {
      throw new WebcamError(WebcamErrors.FLASH_WINDOW_TOO_SMALL);
    }
    this.flash.width = this.viewWidth;
    this.flash.height = this.viewHeight;
    return this;
  }

  enginePlayShutterSound() {
    // eslint-disable-next-line no-underscore-dangle
    return this.flash._play_shutter();
  }

  engineCapture(snapshot, mirror, quality, scale) {
    // eslint-disable-next-line no-underscore-dangle
    return this.flash._capture(snapshot.id, mirror, quality, scale);
  }

  engineDisplay(snapshot) {
    // eslint-disable-next-line no-underscore-dangle
    return this.flash._display(snapshot.id);
  }

  engineGetCanvas(snapshot) {
    // eslint-disable-next-line no-param-reassign
    if (!snapshot.imageData) { snapshot.imageData = this.engineGetImageData(snapshot); }
    const canvas = document.createElement('canvas');
    canvas.width = snapshot.imageData.width;
    canvas.height = snapshot.imageData.height;
    const context = canvas.getContext('2d');
    context.putImageData(snapshot.imageData, 0, 0);
    return canvas;
  }

  engineGetImageData(snapshot) {
    let result;
    const flashData = this.flash.getImageData(snapshot.id);

    if (JpegCamera.canvas_supported()) {
      const canvas = document.createElement('canvas');
      canvas.width = flashData.width;
      canvas.height = flashData.height;
      const context = canvas.getContext('2d');
      result = context.createImageData(flashData.width, flashData.height);
    } else {
      result = {
        data: [],
        width: flashData.width,
        height: flashData.height,
      };
    }

    for (let i = 0; i < flashData.data.length; i++) {
      const pixel = flashData.data[i];
      const index = i * 4;

      /* eslint-disable no-bitwise */
      const red = (pixel >> 16) & 0xff;
      const green = (pixel >> 8) & 0xff;
      const blue = pixel & 0xff;

      result.data[index + 0] = red;
      result.data[index + 1] = green;
      result.data[index + 2] = blue;
      result.data[index + 3] = 255;
    }
    return result;
  }

  engineGetBlob(snapshot, mime, mirror, quality, callback) {
    let canvas;
    // eslint-disable-next-line no-param-reassign
    if (!snapshot.extraCanvas) { snapshot.extraCanvas = this.engineGetCanvas(snapshot); }

    if (mirror) {
      canvas = document.createElement('canvas');
      canvas.width = snapshot.canvas.width;
      canvas.height = snapshot.canvas.height;

      const context = canvas.getContext('2d');
      context.setTransform(1, 0, 0, 1, 0, 0); // reset transformation matrix
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(snapshot.extraCanvas, 0, 0);
    } else {
      canvas = snapshot.extraCanvas;
    }

    return canvas.toBlob((blob => callback(blob)), mime, quality);
  }

  engineDiscard(snapshot) {
    return this.flash.discard(snapshot.id);
  }

  engineShowStream() {
    return this.flash.showStream();
  }

  flashPrepared(width, height) {
    this.blockElementAccess();

    // XXX steal focus from the flash object
    document.body.tabIndex = 0;
    document.body.focus();

    return this.prepared(width, height);
  }
}
