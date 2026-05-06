/**
 * Upload & Webcam Handling Module (RFC 001 Refactored)
 * 
 * Separates validation from UI concerns; provides async processing API;
 * encapsulates webcam state management.
 */

import { showToast } from './ui.js';

// ============================================================================
// NEW API: Pure validation (no side effects)
// ============================================================================

/**
 * Validate file type and size (pure function, no side effects).
 * @param {File} file - File to validate
 * @returns {{ok: boolean, error?: string}}
 */
export function validateFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxBytes = 10 * 1024 * 1024; // 10MB limit

  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: 'Invalid file format! Please upload JPEG or PNG images.'
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      error: 'File is too large! Maximum limit is 10MB.'
    };
  }

  return { ok: true };
}

// ============================================================================
// NEW API: Promise-based file processing
// ============================================================================

/**
 * Process file: read via FileReader and return both File and data URL.
 * @param {File} file - File to process
 * @returns {Promise<{file: File, dataUrl: string}>}
 * @throws {Error} if file reading fails
 */
export async function processFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        file,
        dataUrl: e.target.result
      });
    };
    reader.onerror = () => {
      reject(new Error('Error reading file. Please try another image.'));
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// NEW API: Webcam namespace with lifecycle management
// ============================================================================

let webcamStream = null;

export const webcam = {
  /**
   * Start webcam stream.
   * @param {HTMLVideoElement} videoElement - Target video element
   * @returns {Promise<boolean>} - true if started successfully, false if failed
   */
  async start(videoElement) {
    if (webcamStream) {
      return true; // Already running
    }

    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = webcamStream;
      return true;
    } catch (error) {
      console.error('Webcam Access Error:', error);
      return false;
    }
  },

  /**
   * Stop active webcam stream.
   * @param {HTMLVideoElement} [videoElement] - Optional video element to clean up
   */
  stop(videoElement) {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      webcamStream = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  },

  /**
   * Check if webcam is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return webcamStream !== null;
  },

  /**
   * Capture current frame as File + data URL.
   * @param {HTMLVideoElement} videoElement - The playing webcam stream element
   * @returns {{file: File, dataUrl: string} | null}
   */
  capture(videoElement) {
    if (!webcamStream || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror effect to match the mirrored display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to image format
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Convert Data URL to binary File object
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], 'captured-frame.jpg', { type: 'image/jpeg' });

    return { file, dataUrl };
  }
};

// ============================================================================
// NEW API: Drop zone with validation + processing encapsulated
// ============================================================================

/**
 * Initialize drag-and-drop on zone. Validation and processing are internal.
 * @param {HTMLElement} zone - Drop zone element
 * @param {Function} onFileReady - Callback: ({file, dataUrl}) => void
 * @param {Function} onError - Callback: (errorMessage) => void
 */
export function initDropZone(zone, onFileReady, onError) {
  ['dragenter', 'dragover'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
    }, false);
  });

  zone.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validation = validateFile(file);
      
      if (!validation.ok) {
        onError(validation.error);
        return;
      }

      try {
        const result = await processFile(file);
        onFileReady(result);
      } catch (error) {
        onError(error.message);
      }
    }
  });
}

// ============================================================================
// LEGACY API: Keep old functions for backwards compatibility (deprecating)
// ============================================================================

/**
 * @deprecated Use validateFile() instead (returns structured error, no UI side effects)
 */
export function validateFileOld(file) {
  const result = validateFile(file);
  if (!result.ok) {
    showToast(result.error, 'error');
    return false;
  }
  return true;
}

/**
 * @deprecated Use processFile() and handle errors with showToast() in caller
 */
export function processAndCallbackFile(file, callback) {
  processFile(file)
    .then(result => callback(result.file, result.dataUrl))
    .catch(error => showToast(error.message, 'error'));
}

/**
 * @deprecated Use webcam.start() instead
 */
export async function startWebcam(videoElement) {
  const success = await webcam.start(videoElement);
  if (success) {
    showToast('Webcam stream initialized successfully!', 'success');
  } else {
    showToast('Failed to access camera! Please ensure camera permissions are allowed.', 'error');
  }
  return success;
}

/**
 * @deprecated Use webcam.stop() instead
 */
export function stopWebcam(videoElement) {
  webcam.stop(videoElement);
}

/**
 * @deprecated Use webcam.capture() instead
 */
export function captureWebcamFrame(videoElement) {
  const frame = webcam.capture(videoElement);
  if (!frame) {
    showToast('Webcam stream not ready yet. Please wait...', 'warning');
    return null;
  }
  return frame;
}

/**
 * @deprecated Use initDropZone() instead (with new callback signatures)
 */
export function initDragAndDrop(dropZone, onFileReady) {
  initDropZone(
    dropZone,
    onFileReady,
    (error) => showToast(error, 'error')
  );
}
