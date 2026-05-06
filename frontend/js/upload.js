/**
 * Upload & Webcam Handling Module
 */

import { showToast } from './ui.js';

let webcamStream = null;

/**
 * Validate selected file type & size
 * @param {File} file - Selected file
 * @returns {boolean} - Valid file?
 */
export function validateFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxBytes = 10 * 1024 * 1024; // 10MB limit

  if (!allowedTypes.includes(file.type)) {
    showToast('Invalid file format! Please upload JPEG or PNG images.', 'error');
    return false;
  }

  if (file.size > maxBytes) {
    showToast('File is too large! Maximum limit is 10MB.', 'error');
    return false;
  }

  return true;
}

/**
 * Initialize Drag-and-Drop Event Listeners on the upload zone
 * @param {HTMLElement} dropZone - The drop zone target element
 * @param {Function} onFileReady - Callback containing (file, base64Url)
 */
export function initDragAndDrop(dropZone, onFileReady) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        processAndCallbackFile(file, onFileReady);
      }
    }
  });
}

/**
 * Convert standard File to Base64 data-url and trigger callback
 * @param {File} file - The file to process
 * @param {Function} callback - Callback (file, base64Url)
 */
export function processAndCallbackFile(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    callback(file, e.target.result);
  };
  reader.onerror = () => {
    showToast('Error reading file. Please try another image.', 'error');
  };
  reader.readAsDataURL(file);
}

/**
 * Access media devices and start live webcam video stream
 * @param {HTMLVideoElement} videoElement - Target HTML5 video player
 * @returns {Promise<boolean>} - Success or failure
 */
export async function startWebcam(videoElement) {
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
    showToast('Webcam stream initialized successfully!', 'success');
    return true;
  } catch (error) {
    console.error('Webcam Access Error:', error);
    showToast('Failed to access camera! Please ensure camera permissions are allowed.', 'error');
    return false;
  }
}

/**
 * Stop active webcam stream, releasing camera device
 * @param {HTMLVideoElement} videoElement - Target HTML5 video player
 */
export function stopWebcam(videoElement) {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
  if (videoElement) {
    videoElement.srcObject = null;
  }
}

/**
 * Capture a frame from active webcam stream and convert to a File object
 * @param {HTMLVideoElement} videoElement - The playing webcam stream element
 * @returns {{file: File, dataUrl: string} | null}
 */
export function captureWebcamFrame(videoElement) {
  if (!webcamStream || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
    showToast('Webcam stream not ready yet. Please wait...', 'warning');
    return null;
  }

  const canvas = document.createElement('canvas');
  // Match standard resolution
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
