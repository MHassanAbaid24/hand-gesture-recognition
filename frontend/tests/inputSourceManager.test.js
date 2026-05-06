/**
 * Test suite for Input Source Manager (RFC 004)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { 
  InputSourceManager, 
  InputSource, 
  UploadSource, 
  WebcamSource 
} from '../js/inputSourceManager.js';

// Mock input sources for testing
class MockInputSource extends InputSource {
  constructor(shouldFail = false) {
    super();
    this.shouldFail = shouldFail;
    this.started = false;
    this.stopped = false;
    this.mockStream = null;
  }

  async start() {
    if (this.shouldFail) {
      throw new Error('Mock source start failed');
    }
    this.started = true;
  }

  async stop() {
    this.stopped = true;
    this.started = false;
  }

  getStream() {
    return this.mockStream;
  }
}

describe('InputSourceManager', () => {
  let manager;
  let mockUpload;
  let mockWebcam;
  let domElements;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <button id="toggle-upload" class="active"></button>
      <button id="toggle-webcam"></button>
      <div id="upload-panel" style="display: flex;"></div>
      <div id="webcam-panel" style="display: none;"></div>
    `;

    // Create mock sources
    mockUpload = new MockInputSource();
    mockWebcam = new MockInputSource();

    // Create selectors
    const selectors = {
      toggleUpload: '#toggle-upload',
      toggleWebcam: '#toggle-webcam',
      uploadPanel: '#upload-panel',
      webcamPanel: '#webcam-panel'
    };

    // Create manager
    manager = new InputSourceManager(selectors, {
      upload: mockUpload,
      webcam: mockWebcam
    });

    domElements = {
      toggleUpload: document.querySelector('#toggle-upload'),
      toggleWebcam: document.querySelector('#toggle-webcam'),
      uploadPanel: document.querySelector('#upload-panel'),
      webcamPanel: document.querySelector('#webcam-panel')
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('initializes with upload as default source', async () => {
      await manager.initialize();
      expect(manager.getCurrentSource()).toBe('upload');
    });

    it('sets up toggle button event listeners', async () => {
      const uploadSpy = jest.spyOn(manager, 'activate');
      await manager.initialize();

      domElements.toggleWebcam.click();
      expect(uploadSpy).toHaveBeenCalledWith('webcam');
    });

    it('updates DOM to show upload panel initially', async () => {
      await manager.initialize();
      expect(domElements.uploadPanel.style.display).toBe('flex');
      expect(domElements.webcamPanel.style.display).toBe('none');
    });

    it('marks upload toggle as active initially', async () => {
      await manager.initialize();
      expect(domElements.toggleUpload.classList.contains('active')).toBe(true);
      expect(domElements.toggleWebcam.classList.contains('active')).toBe(false);
    });
  });

  describe('activate source', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('activates a different source', async () => {
      const success = await manager.activate('webcam');

      expect(success).toBe(true);
      expect(manager.getCurrentSource()).toBe('webcam');
      expect(mockWebcam.started).toBe(true);
    });

    it('returns true on successful activation', async () => {
      const success = await manager.activate('webcam');
      expect(success).toBe(true);
    });

    it('returns false on activation failure', async () => {
      const failingWebcam = new MockInputSource(true);
      manager.sources.webcam = failingWebcam;

      const success = await manager.activate('webcam');
      expect(success).toBe(false);
    });

    it('auto-reverts to upload on failure', async () => {
      const failingWebcam = new MockInputSource(true);
      manager.sources.webcam = failingWebcam;

      await manager.activate('webcam');
      expect(manager.getCurrentSource()).toBe('upload');
    });

    it('is idempotent: activating same source twice is safe', async () => {
      await manager.activate('webcam');
      const firstStream = manager.getStream();

      await manager.activate('webcam');
      const secondStream = manager.getStream();

      expect(firstStream).toBe(secondStream);
    });

    it('does nothing if already on the target source', async () => {
      const initialState = manager.getCurrentSource();
      const success = await manager.activate('upload');

      expect(success).toBe(true);
      expect(manager.getCurrentSource()).toBe(initialState);
    });

    it('returns false for unknown source', async () => {
      const success = await manager.activate('unknown');
      expect(success).toBe(false);
    });

    it('stops the previous source when switching', async () => {
      await manager.activate('webcam');
      expect(mockWebcam.started).toBe(true);

      await manager.activate('upload');
      expect(mockWebcam.stopped).toBe(true);
    });
  });

  describe('DOM synchronization', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('updates toggle button classes when source changes', async () => {
      await manager.activate('webcam');

      expect(domElements.toggleUpload.classList.contains('active')).toBe(false);
      expect(domElements.toggleWebcam.classList.contains('active')).toBe(true);
    });

    it('updates aria-selected attributes', async () => {
      await manager.activate('webcam');

      expect(domElements.toggleUpload.getAttribute('aria-selected')).toBe('false');
      expect(domElements.toggleWebcam.getAttribute('aria-selected')).toBe('true');
    });

    it('updates panel visibility', async () => {
      await manager.activate('webcam');

      expect(domElements.uploadPanel.style.display).toBe('none');
      expect(domElements.webcamPanel.style.display).toBe('flex');
    });

    it('shows upload panel and hides webcam when reverting to upload', async () => {
      const failingWebcam = new MockInputSource(true);
      manager.sources.webcam = failingWebcam;

      await manager.activate('webcam');

      expect(domElements.uploadPanel.style.display).toBe('flex');
      expect(domElements.webcamPanel.style.display).toBe('none');
    });
  });

  describe('event listeners', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('emits onSourceChange when source changes', async () => {
      const onChange = jest.fn();
      manager.onSourceChange(onChange);

      await manager.activate('webcam');

      expect(onChange).toHaveBeenCalledWith('webcam');
    });

    it('does not emit onSourceChange for no-op activations', async () => {
      const onChange = jest.fn();
      manager.onSourceChange(onChange);

      await manager.activate('upload');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('emits onSourceError when activation fails', async () => {
      const failingWebcam = new MockInputSource(true);
      manager.sources.webcam = failingWebcam;

      const onError = jest.fn();
      manager.onSourceError(onError);

      await manager.activate('webcam');

      expect(onError).toHaveBeenCalledWith('webcam', expect.any(Error));
    });

    it('allows multiple listeners on the same event', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.onSourceChange(listener1);
      manager.onSourceChange(listener2);

      await manager.activate('webcam');

      expect(listener1).toHaveBeenCalledWith('webcam');
      expect(listener2).toHaveBeenCalledWith('webcam');
    });

    it('emits onSourceError before reverting to upload', async () => {
      const failingWebcam = new MockInputSource(true);
      manager.sources.webcam = failingWebcam;

      const onError = jest.fn();
      manager.onSourceError(onError);

      await manager.activate('webcam');

      expect(onError).toHaveBeenCalled();
      expect(manager.getCurrentSource()).toBe('upload');
    });
  });

  describe('state queries', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('getCurrentSource returns current source', () => {
      expect(manager.getCurrentSource()).toBe('upload');
    });

    it('getStream returns stream from current source', async () => {
      mockUpload.mockStream = { type: 'upload' };
      const stream = manager.getStream();

      expect(stream).toEqual({ type: 'upload' });
    });

    it('getStream returns null if current source has no stream', async () => {
      const stream = manager.getStream();
      expect(stream).toBeNull();
    });

    it('getStream returns stream after switching to webcam', async () => {
      mockWebcam.mockStream = { type: 'webcam' };
      await manager.activate('webcam');

      const stream = manager.getStream();
      expect(stream).toEqual({ type: 'webcam' });
    });
  });
});

describe('InputSource base class', () => {
  it('throws when start is not implemented', async () => {
    const source = new InputSource();
    await expect(source.start()).rejects.toThrow('start() must be implemented');
  });

  it('throws when stop is not implemented', async () => {
    const source = new InputSource();
    await expect(source.stop()).rejects.toThrow('stop() must be implemented');
  });

  it('returns null from getStream by default', () => {
    const source = new InputSource();
    expect(source.getStream()).toBeNull();
  });
});

describe('UploadSource', () => {
  let uploadSource;
  let element;

  beforeEach(() => {
    element = document.createElement('div');
    uploadSource = new UploadSource(element);
  });

  it('can be created with an element', () => {
    expect(uploadSource.element).toBe(element);
  });

  it('start resolves without error', async () => {
    await expect(uploadSource.start()).resolves.toBeUndefined();
  });

  it('stop resolves without error', async () => {
    await expect(uploadSource.stop()).resolves.toBeUndefined();
  });

  it('getStream returns null (uploads do not use streams)', () => {
    expect(uploadSource.getStream()).toBeNull();
  });
});

describe('WebcamSource', () => {
  let webcamSource;
  let videoElement;

  beforeEach(() => {
    videoElement = document.createElement('video');
    webcamSource = new WebcamSource(videoElement);

    // Mock navigator.mediaDevices
    if (!global.navigator) {
      global.navigator = {};
    }
  });

  afterEach(() => {
    if (webcamSource) {
      webcamSource.stop();
    }
  });

  it('can be created with a video element', () => {
    expect(webcamSource.videoElement).toBe(videoElement);
  });

  it('starts webcam and sets up stream', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    await webcamSource.start();

    expect(videoElement.srcObject).toBe(mockStream);
  });

  it('returns the stream from getStream', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    await webcamSource.start();
    const stream = webcamSource.getStream();

    expect(stream).toBe(mockStream);
  });

  it('throws with descriptive error when camera is denied', async () => {
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied'))
    };

    await expect(webcamSource.start()).rejects.toThrow('Camera access failed');
  });

  it('stops webcam and releases tracks', async () => {
    const mockTrack = { stop: jest.fn() };
    const mockStream = {
      getTracks: jest.fn(() => [mockTrack])
    };
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    await webcamSource.start();
    await webcamSource.stop();

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(videoElement.srcObject).toBeNull();
  });

  it('is safe to call stop when not started', async () => {
    await expect(webcamSource.stop()).resolves.toBeUndefined();
  });

  it('is safe to call start multiple times', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    await webcamSource.start();
    await webcamSource.start(); // Should not throw

    expect(webcamSource.getStream()).toBe(mockStream);
  });
});
