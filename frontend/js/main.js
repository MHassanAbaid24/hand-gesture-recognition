/**
 * Main Application Orchestrator & Bootstrapper
 */

import { 
  initializeHeroAnimations,
  createResultsOrchestrator
} from './animationOrchestrator.js';
import { elements, showToast } from './ui.js';
import { 
  validateFile,
  processFile,
  initDropZone,
  webcam
} from './upload.js';
import { 
  InputSourceManager, 
  UploadSource, 
  WebcamSource 
} from './inputSourceManager.js';
import { sendPrediction } from './predict.js';

// Create results state machine once during app init
const resultsDisplay = createResultsOrchestrator();

// Create input source manager once during app init
const sourceManager = new InputSourceManager(
  {
    toggleUpload: '#toggle-upload',
    toggleWebcam: '#toggle-webcam',
    uploadPanel: '#upload-panel',
    webcamPanel: '#webcam-panel'
  },
  {
    upload: new UploadSource(elements.uploadPanel),
    webcam: new WebcamSource(elements.webcamVideo)
  }
);

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
 * Configure input source manager and listen for changes
 */
async function setupInputSourceManager() {
  // Initialize toggle button event listeners
  await sourceManager.initialize();

  // Listen for successful source changes
  sourceManager.onSourceChange((source) => {
    if (source === 'webcam') {
      showToast('Webcam stream initialized successfully!', 'success');
    }
  });

  // Listen for source errors (e.g., camera access denied)
  sourceManager.onSourceError((source, error) => {
    showToast(`Failed to switch to ${source}: ${error.message}`, 'error');
    // Manager already reverted to upload automatically
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
async function init() {
  // 1. Initialize all hero animations as one cohesive unit
  initializeHeroAnimations();
  setupNavbarScrollTrigger();

  // 2. Setup input source manager
  await setupInputSourceManager();

  // 3. Setup inputs and triggers
  setupFileInputEvents();
  setupWebcamEvents();
  
  // 4. Set default state for results panel
  resultsDisplay.showPlaceholder();
}

// Ensure the page DOM content is fully loaded before executing scripts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
