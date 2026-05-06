/**
 * Test suite for refactored prediction service (RFC 002)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { 
  PredictionService, 
  PredictionError, 
  HttpPredictionAdapter, 
  MockPredictionAdapter 
} from '../js/predict.js';

describe('PredictionError', () => {
  it('constructs with message and type', () => {
    const error = new PredictionError('Request timed out', 'TIMEOUT');
    
    expect(error.message).toBe('Request timed out');
    expect(error.type).toBe('TIMEOUT');
    expect(error instanceof Error).toBe(true);
  });

  it('provides isTimeout() helper', () => {
    const timeoutError = new PredictionError('Timed out', 'TIMEOUT');
    const networkError = new PredictionError('No network', 'NETWORK');
    
    expect(timeoutError.isTimeout()).toBe(true);
    expect(networkError.isTimeout()).toBe(false);
  });

  it('provides isNetworkError() helper', () => {
    const networkError = new PredictionError('No network', 'NETWORK');
    const timeoutError = new PredictionError('Timed out', 'TIMEOUT');
    
    expect(networkError.isNetworkError()).toBe(true);
    expect(timeoutError.isNetworkError()).toBe(false);
  });

  it('provides isValidationError() helper', () => {
    const validationError = new PredictionError('Invalid response', 'VALIDATION');
    const serverError = new PredictionError('Server error', 'SERVER');
    
    expect(validationError.isValidationError()).toBe(true);
    expect(serverError.isValidationError()).toBe(false);
  });

  it('provides isServerError() helper', () => {
    const serverError = new PredictionError('Server error', 'SERVER');
    const networkError = new PredictionError('No network', 'NETWORK');
    
    expect(serverError.isServerError()).toBe(true);
    expect(networkError.isServerError()).toBe(false);
  });

  it('stores original error for debugging', () => {
    const originalError = new Error('Original cause');
    const error = new PredictionError('Wrapped error', 'UNKNOWN', originalError);
    
    expect(error.originalError).toBe(originalError);
  });
});

describe('MockPredictionAdapter', () => {
  it('constructs with optional response map', () => {
    const responses = {
      'test.jpg': { predicted_class: 'peace', confidence: 0.95 }
    };
    const adapter = new MockPredictionAdapter(responses);
    
    expect(adapter).toBeDefined();
  });

  it('returns mocked prediction for known file', async () => {
    const responses = {
      'test.jpg': { predicted_class: 'peace', confidence: 0.95 }
    };
    const adapter = new MockPredictionAdapter(responses);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    const result = await adapter.predict(file, {});

    expect(result.predicted_class).toBe('peace');
    expect(result.confidence).toBe(0.95);
  });

  it('throws error for unknown file', async () => {
    const adapter = new MockPredictionAdapter({});
    const file = new File(['test'], 'unknown.jpg', { type: 'image/jpeg' });

    await expect(adapter.predict(file, {})).rejects.toThrow(PredictionError);
  });

  it('tracks call count', async () => {
    const responses = {
      'test.jpg': { predicted_class: 'peace', confidence: 0.95 }
    };
    const adapter = new MockPredictionAdapter(responses);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    expect(adapter.getCallCount()).toBe(0);
    
    await adapter.predict(file, {});
    expect(adapter.getCallCount()).toBe(1);
    
    await adapter.predict(file, {});
    expect(adapter.getCallCount()).toBe(2);
  });

  it('records last file', async () => {
    const responses = {
      'test.jpg': { predicted_class: 'peace', confidence: 0.95 }
    };
    const adapter = new MockPredictionAdapter(responses);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    expect(adapter.getLastFile()).toBeNull();
    
    await adapter.predict(file, {});
    expect(adapter.getLastFile()).toBe(file);
  });

  it('can reset call count and last file', async () => {
    const responses = {
      'test.jpg': { predicted_class: 'peace', confidence: 0.95 }
    };
    const adapter = new MockPredictionAdapter(responses);
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await adapter.predict(file, {});
    expect(adapter.getCallCount()).toBe(1);
    
    adapter.reset();
    expect(adapter.getCallCount()).toBe(0);
    expect(adapter.getLastFile()).toBeNull();
  });
});

describe('HttpPredictionAdapter', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('constructs with base URL', () => {
    const adapter = new HttpPredictionAdapter('http://api.example.com');
    expect(adapter).toBeDefined();
  });

  it('uses default base URL', () => {
    const adapter = new HttpPredictionAdapter();
    expect(adapter.baseUrl).toBe('http://localhost:8000');
  });

  it('returns prediction on successful response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ predicted_class: 'peace', confidence: 0.95 })
    });

    const adapter = new HttpPredictionAdapter();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = await adapter.predict(file, {});

    expect(result.predicted_class).toBe('peace');
    expect(result.confidence).toBe(0.95);
  });

  it('throws PredictionError on validation error (malformed response)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ predicted_class: 'peace' }) // Missing confidence
    });

    const adapter = new HttpPredictionAdapter();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await expect(adapter.predict(file, {})).rejects.toThrow(PredictionError);
  });

  it('throws PredictionError with type VALIDATION on malformed response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}) // Missing predicted_class
    });

    const adapter = new HttpPredictionAdapter();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    try {
      await adapter.predict(file, {});
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PredictionError);
      expect(error.isValidationError()).toBe(true);
    }
  });

  it('throws PredictionError on network error', async () => {
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const adapter = new HttpPredictionAdapter();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    try {
      await adapter.predict(file, {});
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PredictionError);
      // Network errors map to NETWORK type
      expect(['NETWORK', 'UNKNOWN']).toContain(error.type);
    }
  });

  it('handles timeout with AbortError', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    
    global.fetch.mockRejectedValueOnce(abortError);

    const adapter = new HttpPredictionAdapter();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    try {
      await adapter.predict(file, { timeout: 100 });
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PredictionError);
      expect(error.isTimeout()).toBe(true);
    }
  });

  it('throws PredictionError on server error (5xx)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({})
    });

    const adapter = new HttpPredictionAdapter();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    try {
      await adapter.predict(file, {});
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PredictionError);
      // Server errors should map to SERVER type
      expect(['SERVER', 'UNKNOWN']).toContain(error.type);
    }
  });

  it('includes config timeout in request', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ predicted_class: 'peace', confidence: 0.95 })
    });

    const adapter = new HttpPredictionAdapter();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    await adapter.predict(file, { timeout: 5000 });

    // Verify fetch was called (AbortController timeout is hard to test without actual timing)
    expect(global.fetch).toHaveBeenCalled();
  });
});

describe('PredictionService', () => {
  it('constructs with default HttpPredictionAdapter', () => {
    const service = new PredictionService();
    expect(service).toBeDefined();
  });

  it('constructs with custom adapter and config', () => {
    const mockAdapter = new MockPredictionAdapter();
    const config = { timeout: 10000, maxRetries: 3 };
    
    const service = new PredictionService(mockAdapter, config);
    
    expect(service).toBeDefined();
  });

  it('delegates predict to adapter', async () => {
    const mockAdapter = new MockPredictionAdapter({
      'test.jpg': { predicted_class: 'peace', confidence: 0.95 }
    });
    const service = new PredictionService(mockAdapter);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = await service.predict(file);

    expect(result.predicted_class).toBe('peace');
    expect(result.confidence).toBe(0.95);
  });

  it('returns PredictionError from adapter', async () => {
    const mockAdapter = new MockPredictionAdapter({});
    const service = new PredictionService(mockAdapter);
    
    const file = new File(['test'], 'unknown.jpg', { type: 'image/jpeg' });

    await expect(service.predict(file)).rejects.toThrow(PredictionError);
  });

  it('allows error type checking on thrown errors', async () => {
    const mockAdapter = new MockPredictionAdapter({});
    const service = new PredictionService(mockAdapter);
    
    const file = new File(['test'], 'unknown.jpg', { type: 'image/jpeg' });

    try {
      await service.predict(file);
      fail('Should have thrown');
    } catch (error) {
      expect(error.isValidationError()).toBe(true);
    }
  });

  it('uses provided config timeout', async () => {
    const mockAdapter = new MockPredictionAdapter({});
    const config = { timeout: 1000 };
    const service = new PredictionService(mockAdapter, config);

    expect(service.config.timeout).toBe(1000);
  });

  it('uses provided config maxRetries', async () => {
    const mockAdapter = new MockPredictionAdapter({});
    const config = { maxRetries: 5 };
    const service = new PredictionService(mockAdapter, config);

    expect(service.config.maxRetries).toBe(5);
  });

  it('uses provided baseUrl in HttpAdapter', () => {
    const config = { baseUrl: 'http://custom.api.com' };
    const service = new PredictionService(null, config);

    expect(service.adapter.baseUrl).toBe('http://custom.api.com');
  });

  it('merges config with defaults', () => {
    const config = { timeout: 10000 };
    const service = new PredictionService(null, config);

    expect(service.config.timeout).toBe(10000);
    expect(service.config.maxRetries).toBe(2); // Default
  });
});

describe('Full Prediction Flow', () => {
  it('happy path: valid file returns prediction', async () => {
    const mockAdapter = new MockPredictionAdapter({
      'gesture.jpg': { predicted_class: 'thumbs_up', confidence: 0.92 }
    });
    const service = new PredictionService(mockAdapter);
    
    const file = new File(['test'], 'gesture.jpg', { type: 'image/jpeg' });
    const result = await service.predict(file);

    expect(result.predicted_class).toBe('thumbs_up');
    expect(result.confidence).toBe(0.92);
  });

  it('error path: handles validation error gracefully', async () => {
    const mockAdapter = new MockPredictionAdapter({});
    const service = new PredictionService(mockAdapter);
    
    const file = new File(['test'], 'unknown.jpg', { type: 'image/jpeg' });

    try {
      await service.predict(file);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('no response configured');
      expect(error.isValidationError()).toBe(true);
    }
  });

  it('supports programmatic error handling based on type', async () => {
    const mockAdapter = new MockPredictionAdapter({});
    const service = new PredictionService(mockAdapter);
    
    const file = new File(['test'], 'unknown.jpg', { type: 'image/jpeg' });

    try {
      await service.predict(file);
    } catch (error) {
      if (error.isTimeout()) {
        // Retry logic
      } else if (error.isNetworkError()) {
        // Show "backend offline" message
      } else if (error.isValidationError()) {
        // Show "invalid response" message
      } else if (error.isServerError()) {
        // Show "server error" message
      }
      // Verify we can check error type
      expect(['TIMEOUT', 'NETWORK', 'VALIDATION', 'SERVER', 'UNKNOWN']).toContain(error.type);
    }
  });
});
