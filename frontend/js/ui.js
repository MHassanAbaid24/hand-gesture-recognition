/**
 * UI & Utilities Module
 * 
 * Provides:
 * - DOM element selectors cache
 * - Toast notification functionality
 */

import { animateToast } from './animations.js';

// DOM Selectors cached for performance
export const elements = {
  // Toggles
  toggleUpload: document.getElementById('toggle-upload'),
  toggleWebcam: document.getElementById('toggle-webcam'),
  
  // Panels
  uploadPanel: document.getElementById('upload-panel'),
  webcamPanel: document.getElementById('webcam-panel'),
  
  // Results view wrappers
  resultPlaceholder: document.getElementById('result-placeholder'),
  skeletonLoader: document.getElementById('skeleton-loader'),
  resultContent: document.getElementById('result-content'),
  
  // Dynamic fields
  previewImg: document.getElementById('preview-img'),
  gestureName: document.getElementById('gesture-name'),
  confidencePercentage: document.getElementById('confidence-percentage'),
  confidenceFill: document.getElementById('confidence-fill'),
  
  // Interactive inputs
  fileInput: document.getElementById('file-input'),
  browseBtn: document.getElementById('browse-btn'),
  captureBtn: document.getElementById('capture-btn'),
  webcamVideo: document.getElementById('webcam-video'),
  
  // Toasters
  toastContainer: document.getElementById('toast-container')
};



/**
 * Display a premium, accessible toast message to the user
 * @param {string} message - Text notification message
 * @param {'success' | 'error' | 'warning'} type - Visual status type
 */
export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  
  let icon = '🔔';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  elements.toastContainer.appendChild(toast);
  
  // Animate with GSAP, automatically removing from DOM on completion
  animateToast(toast, () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });
}


