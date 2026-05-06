/**
 * Input Source Manager Module (RFC 004 Refactored)
 * 
 * Centralizes input source management with pluggable sources.
 * Owns the state (single source of truth); DOM is synchronized as side effect.
 */

// ============================================================================
// INPUT SOURCE INTERFACE
// ============================================================================

/**
 * Abstract base class for input sources.
 * Implementations can be Upload, Webcam, Screen Capture, Phone Camera, etc.
 */
export class InputSource {
  /**
   * Start this input source (e.g., request camera permission).
   * @returns {Promise<void>}
   * @throws {Error} if unable to start
   */
  async start() {
    throw new Error('start() must be implemented');
  }

  /**
   * Stop this input source (e.g., release camera stream).
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('stop() must be implemented');
  }

  /**
   * Get the active stream (if available).
   * @returns {MediaStream | null}
   */
  getStream() {
    return null;
  }
}

// ============================================================================
// UPLOAD SOURCE IMPLEMENTATION
// ============================================================================

/**
 * Input source for file uploads and drag-and-drop.
 */
export class UploadSource extends InputSource {
  constructor(element) {
    super();
    this.element = element;
  }

  async start() {
    // Upload is always "on"; no setup needed
  }

  async stop() {
    // Nothing to cleanup for uploads
  }

  getStream() {
    return null; // Upload doesn't use MediaStream
  }
}

// ============================================================================
// WEBCAM SOURCE IMPLEMENTATION
// ============================================================================

/**
 * Input source for live webcam streaming.
 */
export class WebcamSource extends InputSource {
  constructor(videoElement) {
    super();
    this.videoElement = videoElement;
    this.stream = null;
  }

  async start() {
    if (this.stream) return; // Already started

    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
    } catch (error) {
      throw new Error(`Camera access failed: ${error.message}`);
    }
  }

  async stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.videoElement.srcObject = null;
    }
  }

  getStream() {
    return this.stream;
  }
}

// ============================================================================
// INPUT SOURCE MANAGER (Main API)
// ============================================================================

/**
 * Manages input source selection and stream lifecycle.
 * Owns the state; DOM is synchronized as side effect.
 */
export class InputSourceManager {
  /**
   * @param {Object} selectors - { toggleUpload, toggleWebcam, uploadPanel, webcamPanel }
   * @param {Object} sources - { upload: UploadSource, webcam: WebcamSource, ...custom }
   */
  constructor(selectors, sources = {}) {
    this.selectors = selectors;
    this.sources = sources;
    this.currentSource = 'upload'; // Source of truth
    this.listeners = {
      onSourceChange: [],
      onSourceError: []
    };
  }

  /**
   * One-time initialization. Sets up toggle buttons and event handlers.
   */
  async initialize() {
    const uploadToggle = document.querySelector(this.selectors.toggleUpload);
    const webcamToggle = document.querySelector(this.selectors.toggleWebcam);

    uploadToggle?.addEventListener('click', () => this.activate('upload'));
    webcamToggle?.addEventListener('click', () => this.activate('webcam'));

    // Set initial state
    this.updateDOM();
  }

  /**
   * Programmatically activate an input source.
   * Handles fallback: if source fails, reverts to 'upload'.
   * 
   * @param {string} source - Source name ('upload', 'webcam', or custom)
   * @returns {Promise<boolean>} - true if successful, false if failed (reverted)
   */
  async activate(source) {
    if (source === this.currentSource) return true; // Already active

    const sourceHandler = this.sources[source];
    if (!sourceHandler) {
      this.emit('onSourceError', source, new Error(`Unknown source: ${source}`));
      return false;
    }

    // Stop current source
    if (this.currentSource !== 'upload') {
      await this.sources[this.currentSource].stop?.();
    }

    // Try to start new source
    try {
      await sourceHandler.start?.();
      this.currentSource = source;
      this.updateDOM();
      this.emit('onSourceChange', source);
      return true;
    } catch (error) {
      // Fallback to upload on failure
      this.currentSource = 'upload';
      await this.sources.upload.start?.();
      this.updateDOM();
      this.emit('onSourceError', source, error);
      return false;
    }
  }

  /**
   * Get current active source.
   * @returns {string}
   */
  getCurrentSource() {
    return this.currentSource;
  }

  /**
   * Get stream from current source (if available).
   * @returns {MediaStream | null}
   */
  getStream() {
    const source = this.sources[this.currentSource];
    return source?.getStream?.() || null;
  }

  /**
   * Register listener for source changes.
   * @param {Function} callback - (source: string) => void
   */
  onSourceChange(callback) {
    this.listeners.onSourceChange.push(callback);
  }

  /**
   * Register listener for source errors.
   * @param {Function} callback - (source: string, error: Error) => void
   */
  onSourceError(callback) {
    this.listeners.onSourceError.push(callback);
  }

  // ========================================================================
  // INTERNAL METHODS
  // ========================================================================

  /**
   * Synchronize DOM to reflect internal state.
   * @private
   */
  updateDOM() {
    const uploadPanel = document.querySelector(this.selectors.uploadPanel);
    const webcamPanel = document.querySelector(this.selectors.webcamPanel);
    const uploadToggle = document.querySelector(this.selectors.toggleUpload);
    const webcamToggle = document.querySelector(this.selectors.toggleWebcam);

    // Update toggle buttons
    if (this.currentSource === 'upload') {
      uploadToggle?.classList.add('active');
      uploadToggle?.setAttribute('aria-selected', 'true');
      webcamToggle?.classList.remove('active');
      webcamToggle?.setAttribute('aria-selected', 'false');
    } else if (this.currentSource === 'webcam') {
      webcamToggle?.classList.add('active');
      webcamToggle?.setAttribute('aria-selected', 'true');
      uploadToggle?.classList.remove('active');
      uploadToggle?.setAttribute('aria-selected', 'false');
    }

    // Update panels
    uploadPanel.style.display = this.currentSource === 'upload' ? 'flex' : 'none';
    webcamPanel.style.display = this.currentSource === 'webcam' ? 'flex' : 'none';
  }

  /**
   * Emit an event to all registered listeners.
   * @private
   */
  emit(event, ...args) {
    this.listeners[event].forEach(callback => callback(...args));
  }
}
