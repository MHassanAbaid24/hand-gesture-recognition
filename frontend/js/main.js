/**
 * Main Application Orchestrator & Bootstrapper
 */

import { 
  animateHero, 
  initHeroParallax, 
  initCustomCursor, 
  initTiltCards, 
  initMagneticButtons 
} from './animations.js';
import { elements, setResultsState, showToast, updateResultData } from './ui.js';
import { 
  initDragAndDrop, 
  processAndCallbackFile, 
  startWebcam, 
  stopWebcam, 
  captureWebcamFrame,
  validateFile
} from './upload.js';
import { sendPrediction } from './predict.js';

/**
 * Handle execution of AI model prediction
 * @param {File} file - Captured frame or selected file
 * @param {string} dataUrl - Target image visual preview source
 */
async function handlePrediction(file, dataUrl) {
  // 1. Transition results panel to a premium loading skeleton state
  setResultsState('loading');
  showToast('Classifying hand gesture...', 'success');

  try {
    // 2. Perform the POST API call
    const result = await sendPrediction(file);
    
    // 3. Update the results panel with outputs and initiate GSAP fills
    updateResultData(dataUrl, result.predicted_class, result.confidence);
    showToast('Classification complete!', 'success');
  } catch (error) {
    // 4. Handle network or API exceptions gracefully
    showToast(error.message, 'error');
    setResultsState('placeholder');
  }
}

/**
 * Configure input source panels (toggle between manual files and live cameras)
 */
function setupInputSourceToggles() {
  // Switch to Manual File Uploads
  elements.toggleUpload.addEventListener('click', () => {
    if (elements.toggleUpload.classList.contains('active')) return;
    
    elements.toggleUpload.classList.add('active');
    elements.toggleUpload.setAttribute('aria-selected', 'true');
    
    elements.toggleWebcam.classList.remove('active');
    elements.toggleWebcam.setAttribute('aria-selected', 'false');
    
    elements.uploadPanel.style.display = 'flex';
    elements.webcamPanel.style.display = 'none';
    
    // Stop webcam streaming tracks
    stopWebcam(elements.webcamVideo);
  });

  // Switch to Live Webcam Streaming
  elements.toggleWebcam.addEventListener('click', async () => {
    if (elements.toggleWebcam.classList.contains('active')) return;
    
    elements.toggleWebcam.classList.add('active');
    elements.toggleWebcam.setAttribute('aria-selected', 'true');
    
    elements.toggleUpload.classList.remove('active');
    elements.toggleUpload.setAttribute('aria-selected', 'false');
    
    elements.webcamPanel.style.display = 'flex';
    elements.uploadPanel.style.display = 'none';
    
    // Attempt starting the camera stream
    const active = await startWebcam(elements.webcamVideo);
    
    // Fallback if camera stream access is rejected/unsupported
    if (!active) {
      elements.toggleUpload.click();
    }
  });
}

/**
 * Initialize all manual and file-system input triggers
 */
function setupFileInputEvents() {
  // Browse files button trigger
  elements.browseBtn.addEventListener('click', () => {
    elements.fileInput.click();
  });

  // Handle local file system selection
  elements.fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        processAndCallbackFile(file, (readyFile, dataUrl) => {
          handlePrediction(readyFile, dataUrl);
        });
      }
    }
    // Reset file input value to allow re-uploading same image
    elements.fileInput.value = '';
  });

  // Handle drag and drop files onto the zone
  initDragAndDrop(elements.uploadPanel, (readyFile, dataUrl) => {
    handlePrediction(readyFile, dataUrl);
  });
}

/**
 * Initialize camera and real-time capture action events
 */
function setupWebcamEvents() {
  elements.captureBtn.addEventListener('click', () => {
    const frameData = captureWebcamFrame(elements.webcamVideo);
    if (frameData) {
      handlePrediction(frameData.file, frameData.dataUrl);
    }
  });
}

/**
 * Hide navbar initially and reveal it once the user scrolls past 150px
 */
function setupNavbarScrollTrigger() {
  const header = document.querySelector('.app-header');
  if (!header) return;

  const toggleHeaderVisibility = () => {
    if (window.scrollY > 150) {
      header.classList.add('visible');
    } else {
      header.classList.remove('visible');
    }
  };

  // Run once initially in case page loaded scrolled down
  toggleHeaderVisibility();

  // Attach high-performance window scroll tracker
  window.addEventListener('scroll', toggleHeaderVisibility, { passive: true });
}

/**
 * Initialize application events and trigger page entrances
 */
function init() {
  // 1. Kickstart premium loading effects and parallax motions
  animateHero();
  initHeroParallax();
  initCustomCursor();
  initTiltCards();
  initMagneticButtons();
  setupNavbarScrollTrigger();

  // 2. Setup inputs and triggers
  setupInputSourceToggles();
  setupFileInputEvents();
  setupWebcamEvents();
  
  // 3. Set default state for results panel
  setResultsState('placeholder');
}

// Ensure the page DOM content is fully loaded before executing scripts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
