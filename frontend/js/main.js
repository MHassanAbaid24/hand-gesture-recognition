/**
 * Main Application Orchestrator & Bootstrapper
 */

import { 
  initializeHeroAnimations,
  createResultsOrchestrator
} from './animationOrchestrator.js';
import { elements, showToast } from './ui.js';
import { 
  initDragAndDrop, 
  validateFile,
  processFile,
  initDropZone,
  startWebcam, 
  stopWebcam, 
  captureWebcamFrame,
  webcam
} from './upload.js';
import { sendPrediction } from './predict.js';

// Create results state machine once during app init
const resultsDisplay = createResultsOrchestrator();

/**
 * Handle execution of AI model prediction
 * @param {File} file - Captured frame or selected file
 * @param {string} dataUrl - Target image visual preview source
 */
async function handlePrediction(file, dataUrl) {
  // 1. Transition to loading state
  resultsDisplay.showLoading();
  showToast('Classifying hand gesture...', 'success');

  try {
    // 2. Perform the POST API call
    const result = await sendPrediction(file);
    
    // 3. Display results with animation
    resultsDisplay.showSuccess(dataUrl, result.predicted_class, result.confidence);
    showToast('Classification complete!', 'success');
  } catch (error) {
    // 4. Handle network or API exceptions gracefully
    resultsDisplay.showError();
    showToast(error.message, 'error');
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
    
    // Stop webcam streaming tracks (using new API)
    webcam.stop(elements.webcamVideo);
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
    
    // Attempt starting the camera stream (using new API)
    const active = await webcam.start(elements.webcamVideo);
    
    // Fallback if camera stream access is rejected/unsupported
    if (!active) {
      showToast('Failed to access camera! Please ensure camera permissions are allowed.', 'error');
      elements.toggleUpload.click();
    } else {
      showToast('Webcam stream initialized successfully!', 'success');
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

  // Handle local file system selection (using new API)
  elements.fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validation = validateFile(file);
      
      if (!validation.ok) {
        showToast(validation.error, 'error');
      } else {
        try {
          const result = await processFile(file);
          handlePrediction(result.file, result.dataUrl);
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    }
    // Reset file input value to allow re-uploading same image
    elements.fileInput.value = '';
  });

  // Handle drag and drop files onto the zone (using new API)
  initDropZone(
    elements.uploadPanel,
    ({ file, dataUrl }) => handlePrediction(file, dataUrl),
    (error) => showToast(error, 'error')
  );
}

/**
 * Initialize camera and real-time capture action events
 */
function setupWebcamEvents() {
  elements.captureBtn.addEventListener('click', () => {
    const frameData = webcam.capture(elements.webcamVideo);
    if (frameData) {
      handlePrediction(frameData.file, frameData.dataUrl);
    } else {
      showToast('Webcam stream not ready yet. Please wait...', 'warning');
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
  // 1. Initialize all hero animations as one cohesive unit
  initializeHeroAnimations();
  setupNavbarScrollTrigger();

  // 2. Setup inputs and triggers
  setupInputSourceToggles();
  setupFileInputEvents();
  setupWebcamEvents();
  
  // 3. Set default state for results panel
  resultsDisplay.showPlaceholder();
}

// Ensure the page DOM content is fully loaded before executing scripts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
