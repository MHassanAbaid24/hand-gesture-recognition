/**
 * UI & State Management Module
 */

import { animateConfidence, revealResults, animateToast } from './animations.js';

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
 * Transition the results container between different visual states
 * @param {'placeholder' | 'loading' | 'success'} state - Visual representation state
 */
export function setResultsState(state) {
  // Hide all state wrappers
  elements.resultPlaceholder.style.display = 'none';
  elements.skeletonLoader.style.display = 'none';
  elements.resultContent.style.display = 'none';

  switch (state) {
    case 'placeholder':
      elements.resultPlaceholder.style.display = 'flex';
      break;
    case 'loading':
      elements.skeletonLoader.style.display = 'flex';
      break;
    case 'success':
      elements.resultContent.style.display = 'flex';
      revealResults(elements.resultContent);
      break;
  }
}

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

/**
 * Set and animate predictions data on the results card
 * @param {string} imageSrc - Base64 or object URL of the classified frame
 * @param {string} gesture - The predicted hand gesture label
 * @param {number} confidence - Decimal (e.g. 0.85) or raw percent (e.g. 85.3)
 */
export function updateResultData(imageSrc, gesture, confidence) {
  // Ensure we get a percentage value
  const confidencePercent = confidence <= 1.0 ? confidence * 100 : confidence;
  
  // Update source content
  elements.previewImg.src = imageSrc;
  elements.gestureName.textContent = gesture;
  
  // Transition to results state first
  setResultsState('success');
  
  // Perform progress filling & ticker updates
  animateConfidence(
    elements.confidenceFill, 
    elements.confidencePercentage, 
    Math.round(confidencePercent)
  );
}
