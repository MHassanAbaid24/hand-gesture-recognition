/* NeuroSign page script (extracted from frontend/index.html) */
lucide.createIcons();

// --- Backend config ---
const BACKEND_BASE_URL = 'http://localhost:8000';
const PREDICT_ENDPOINT = `${BACKEND_BASE_URL}/predict`;

// --- Custom Cursor ---
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (cursorDot) {
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;
  }
});

function animateCursor() {
  ringX += (mouseX - ringX) * 0.15;
  ringY += (mouseY - ringY) * 0.15;
  if (cursorRing) {
    cursorRing.style.left = `${ringX - 17}px`;
    cursorRing.style.top = `${ringY - 17}px`;
  }
  requestAnimationFrame(animateCursor);
}
animateCursor();

// --- Three.js Hologram Background ---
let scene, camera, renderer, glyphGroup;
const container = document.getElementById('hologram-canvas-container');

function createLetterTexture(letter) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 100px Space Grotesk';
  ctx.fillStyle = '#00f2ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00f2ff';
  ctx.fillText(letter, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function initHologram() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  glyphGroup = new THREE.Group();
  scene.add(glyphGroup);

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const glyphCount = 50;
  const minDist = 1.6;
  const positions = [];

  for (let i = 0; i < glyphCount; i++) {
    let pos;
    let attempts = 0;
    while (attempts < 100) {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6
      );
      const tooClose = positions.some(p => pos.distanceTo(p) < minDist);
      if (!tooClose) break;
      attempts++;
    }
    positions.push(pos);

    const char = letters[Math.floor(Math.random() * letters.length)];
    const texture = createLetterTexture(char);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(pos);
    const scale = 0.4 + Math.random() * 1.2;
    sprite.scale.set(scale, scale, 1);
    sprite.userData = {
      offset: Math.random() * Math.PI * 2,
      originalScale: scale,
      yBase: pos.y
    };
    glyphGroup.add(sprite);
  }
  camera.position.z = 8;
}

function animateHologram() {
  requestAnimationFrame(animateHologram);

  if (!glyphGroup) return;

  glyphGroup.rotation.y += ((mouseX / window.innerWidth - 0.5) * 0.4 - glyphGroup.rotation.y) * 0.05;
  glyphGroup.rotation.x += ((mouseY / window.innerHeight - 0.5) * 0.2 - glyphGroup.rotation.x) * 0.05;

  glyphGroup.children.forEach(child => {
    if (child.isSprite) {
      child.position.y = child.userData.yBase + Math.sin(Date.now() * 0.001 + child.userData.offset) * 0.1;
      const pulse = 1 + Math.sin(Date.now() * 0.002 + child.userData.offset) * 0.05;
      child.scale.set(child.userData.originalScale * pulse, child.userData.originalScale * pulse, 1);
    }
  });

  renderer.render(scene, camera);
}

// --- Backend Functionality Integration ---
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const cameraBtn = document.getElementById('camera-btn');
const video = document.getElementById('webcam');
const previewImg = document.getElementById('preview-img');
const overlay = document.getElementById('cam-overlay');
const signVal = document.getElementById('sign-val');
const confVal = document.getElementById('conf-val');
const confContainer = document.getElementById('conf-container');
const sysStatus = document.getElementById('system-status');
const scanline = document.querySelector('.scanline');

let cameraActive = false;

function hideScanline() {
  if (scanline) scanline.classList.add('is-hidden');
}

function validateFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: 'Invalid format. Use JPEG/PNG.' };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: 'File too large (Max 10MB).' };
  }
  return { ok: true };
}

async function processFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ file, dataUrl: e.target.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

if (uploadBtn && fileInput) {
  uploadBtn.addEventListener('click', () => fileInput.click());
}

if (cameraBtn) {
  cameraBtn.addEventListener('click', async () => {
    if (cameraActive) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      await performPrediction(base64Data);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.style.display = 'block';
      if (previewImg) previewImg.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      cameraActive = true;
      cameraBtn.innerHTML = '<i data-lucide="zap"></i> Snap & Analyze';
      lucide.createIcons();
      if (sysStatus) sysStatus.innerText = "LENS_ACTIVE";
    } catch (err) {
      console.error("Camera access denied.", err);
    }
  });
}

if (fileInput) {
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.ok) {
      if (sysStatus) sysStatus.innerText = validation.error;
      return;
    }

    try {
      const { dataUrl } = await processFile(file);

      if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.style.display = 'block';
      }
      if (video) video.style.display = 'none';
      if (overlay) overlay.style.display = 'none';

      const base64Data = dataUrl.split(',')[1];
      await performPrediction(base64Data);
    } catch (err) {
      console.error("File processing error", err);
    }
  });
}

async function performPrediction(base64Image) {
  if (signVal) signVal.innerText = "...";
  if (confContainer) confContainer.style.visibility = 'visible';
  if (confVal) confVal.innerText = "CLASSIFYING...";
  if (sysStatus) sysStatus.innerText = "NEURAL_PROCESSING";

  // Ensure scanline is visible at the start of a new prediction
  if (scanline) scanline.classList.remove('is-hidden');

  gsap.to(glyphGroup.scale, {
    x: 1.15,
    y: 1.15,
    z: 1.15,
    duration: 0.15,
    yoyo: true,
    repeat: 1
  });

  const mimeType = 'image/png';

  const toBlobFromBase64 = (b64, type) => {
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type });
  };

  const imageBlob = toBlobFromBase64(base64Image, mimeType);
  const file = new File([imageBlob], 'upload.png', { type: mimeType });

  let retries = 0;
  const maxRetries = 5;

  const makeRequest = async () => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(PREDICT_ENDPOINT, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${response.statusText}${text ? `: ${text}` : ''}`);
    }

    const data = await response.json();
    if (!data || typeof data.predicted_class !== 'string' || typeof data.confidence !== 'number') {
      throw new Error('Malformed backend response');
    }
    return data;
  };

  while (retries < maxRetries) {
    try {
      const result = await makeRequest();

      if (signVal) signVal.innerText = result.predicted_class;
      if (confVal) confVal.innerText = `${Math.round(result.confidence * 100)}% Accuracy`;
      if (sysStatus) sysStatus.innerText = "ANALYSIS_COMPLETE";

      // Hide scanline once a decision is made
      hideScanline();
      return;
    } catch (error) {
      retries++;
      const delay = Math.pow(2, retries) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  if (signVal) signVal.innerText = "!";
  if (confVal) confVal.innerText = "SIGNAL_LOST";
  if (sysStatus) sysStatus.innerText = "SERVICE_UNAVAILABLE";

  // Also hide scanline when we give up / fail
  hideScanline();
}

// Boot hologram once DOM is loaded
window.addEventListener('load', () => {
  initHologram();
  animateHologram();
});
