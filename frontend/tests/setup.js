/**
 * Test setup and global mocks
 */

// Mock DOM structure for all tests
beforeEach(() => {
  document.body.innerHTML = `
    <div id="result-placeholder" style="display: flex;"></div>
    <div id="skeleton-loader" style="display: none;"></div>
    <div id="result-content" style="display: none;">
      <img id="preview-img" />
      <div id="gesture-name"></div>
      <div id="confidence-fill" style="width: 0%;"></div>
      <div id="confidence-percentage">0%</div>
    </div>
    <div id="toggle-upload" class="active" aria-selected="true"></div>
    <div id="toggle-webcam" aria-selected="false"></div>
    <div id="upload-panel" style="display: flex;"></div>
    <div id="webcam-panel" style="display: none;"></div>
    <input id="file-input" type="file" />
    <button id="browse-btn"></button>
    <button id="capture-btn"></button>
    <video id="webcam-video"></video>
    <div id="toast-container"></div>
  `;
});

// Clean up after each test
afterEach(() => {
  document.body.innerHTML = '';
  delete window.gsap; // Clean up any GSAP mocks
});
