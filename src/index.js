import JpegCameraHtml5 from './jpeg_camera_html5';
import JpegCameraFlash from './jpeg_camera_flash';
import { WebcamError, WebcamErrors } from './errors';

if (!navigator.getUserMedia) {
  navigator.getUserMedia =
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
}
if (!window.AudioContext) { window.AudioContext = window.webkitAudioContext; }

/**
 * @option options dontCheckFlash [Boolean] - if this option is set the engine will
 *   try the HTML5 version first and if this fails it will render the flash object
 *   without trying to determine if flash is installed and what version is it.
 *   This is required for Safari 10 which hides the fact of Flash being installed (but disabled
 *   by default). Rendering the Flash object will trigger confirmation dialog "Would you like
 *   to use Flash". WARNING - forcing render in such way means that the onError will never get
 *   executed in case the client disallow Flash to run.
 */

const JpegCamera = (container, options) => {
  const html5Init = () => new JpegCameraHtml5(container, options);
  const flashInit = () => new JpegCameraFlash(container, options);
  const initError = () => { throw new WebcamError(WebcamErrors.NO_GET_MEDIA_NOR_FLASH_AVAILABLE); };

  if (!options.onInit) {
    throw new WebcamError(WebcamErrors.INCORRECT_INITIALISATION);
  }

  JpegCameraHtml5.engineCheck(
    /* success */ () => { options.onInit(html5Init()); },
    /* failure */ () => {
      JpegCameraFlash.engineCheck(
        /* success */ () => { options.onInit(flashInit()); },
        /* failure */ () => { if (options.onError) options.onError(initError()); },
      );
    },
  );
};

export default JpegCamera;
