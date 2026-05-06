/**
 * Test suite for refactored upload module (RFC 001)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { 
  validateFile, 
  processFile, 
  initDropZone, 
  webcam 
} from '../js/upload.js';

describe('validateFile', () => {
  it('returns {ok: true} for valid JPEG file', () => {
    const file = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
    const result = validateFile(file);
    
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns {ok: true} for valid PNG file', () => {
    const file = new File(['test'], 'image.png', { type: 'image/png' });
    const result = validateFile(file);
    
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects invalid MIME type', () => {
    const file = new File(['text'], 'test.txt', { type: 'text/plain' });
    const result = validateFile(file);
    
    expect(result.ok).toBe(false);
    expect(result.error).toContain('JPEG or PNG');
  });

  it('rejects oversized file (>10MB)', () => {
    const largeBuffer = new Uint8Array(11 * 1024 * 1024);
    const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
    const result = validateFile(file);
    
    expect(result.ok).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('accepts file exactly at 10MB limit', () => {
    const buffer = new Uint8Array(10 * 1024 * 1024);
    const file = new File([buffer], 'exact.jpg', { type: 'image/jpeg' });
    const result = validateFile(file);
    
    expect(result.ok).toBe(true);
  });

  it('rejects file just over 10MB limit', () => {
    const buffer = new Uint8Array(10 * 1024 * 1024 + 1);
    const file = new File([buffer], 'over.jpg', { type: 'image/jpeg' });
    const result = validateFile(file);
    
    expect(result.ok).toBe(false);
    expect(result.error).toContain('too large');
  });
});

describe('processFile', () => {
  it('returns {file, dataUrl} for valid file', async () => {
    const file = new File(['test data'], 'image.jpg', { type: 'image/jpeg' });
    const result = await processFile(file);
    
    expect(result.file).toBe(file);
    expect(result.dataUrl).toMatch(/^data:image\/jpeg/);
    expect(result.dataUrl).toContain('base64');
  }, 10000);

  it('includes file in result unchanged', async () => {
    const file = new File(['test'], 'photo.png', { type: 'image/png' });
    const result = await processFile(file);
    
    expect(result.file).toBe(file);
    expect(result.file.name).toBe('photo.png');
    expect(result.file.type).toBe('image/png');
  }, 10000);

  it('produces valid data URLs', async () => {
    const file = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
    const result = await processFile(file);
    
    expect(result.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.dataUrl.length).toBeGreaterThan('data:image/jpeg;base64,'.length);
  }, 10000);
});

describe('webcam', () => {
  afterEach(() => {
    if (webcam.isRunning()) {
      webcam.stop();
    }
  });

  it('reports not running initially', () => {
    expect(webcam.isRunning()).toBe(false);
  });

  it('starts webcam stream when mediaDevices available', async () => {
    // Mock navigator.mediaDevices properly
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }])
    };
    
    if (!global.navigator) {
      global.navigator = {};
    }
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    const videoElement = document.createElement('video');
    const success = await webcam.start(videoElement);

    expect(success).toBe(true);
    expect(webcam.isRunning()).toBe(true);
  });

  it('returns false when camera access is denied', async () => {
    if (!global.navigator) {
      global.navigator = {};
    }
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied'))
    };

    const videoElement = document.createElement('video');
    const success = await webcam.start(videoElement);

    expect(success).toBe(false);
    expect(webcam.isRunning()).toBe(false);
  });

  it('stops webcam and releases tracks', async () => {
    const mockTrack = { stop: jest.fn() };
    const mockStream = {
      getTracks: jest.fn(() => [mockTrack])
    };
    
    if (!global.navigator) {
      global.navigator = {};
    }
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    const videoElement = document.createElement('video');
    await webcam.start(videoElement);
    
    expect(webcam.isRunning()).toBe(true);
    
    webcam.stop();

    expect(webcam.isRunning()).toBe(false);
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('is safe to call stop when not running', () => {
    expect(() => {
      webcam.stop();
    }).not.toThrow();
    
    expect(webcam.isRunning()).toBe(false);
  });

  it('returns null if capture called when not running', () => {
    const videoElement = document.createElement('video');
    const frame = webcam.capture(videoElement);

    expect(frame).toBeNull();
  });
});

describe('initDropZone', () => {
  it('sets up event listeners without throwing', () => {
    const zone = document.createElement('div');
    const onFileReady = jest.fn();
    const onError = jest.fn();

    expect(() => {
      initDropZone(zone, onFileReady, onError);
    }).not.toThrow();
  });

  it('validation allows JPEG and PNG files', () => {
    const jpegFile = new File(['test'], 'image.jpg', { type: 'image/jpeg' });
    const pngFile = new File(['test'], 'image.png', { type: 'image/png' });
    
    expect(validateFile(jpegFile).ok).toBe(true);
    expect(validateFile(pngFile).ok).toBe(true);
  });

  it('validation rejects other file types', () => {
    const txtFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const result = validateFile(txtFile);
    
    expect(result.ok).toBe(false);
    expect(result.error).toContain('JPEG or PNG');
  });
});
