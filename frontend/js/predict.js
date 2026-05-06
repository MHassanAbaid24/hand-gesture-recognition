/**
 * Prediction Service Module (RFC 002 Refactored)
 * 
 * Provides Ports & Adapters pattern with structured error handling,
 * making it testable without network calls.
 */

// ============================================================================
// NEW API: PredictionError (RFC 002)
// ============================================================================

/**
 * Structured error for all prediction failures.
 * Allows programmatic error handling based on error type.
 */
export class PredictionError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} type - Error type: TIMEOUT | NETWORK | VALIDATION | SERVER | UNKNOWN
   * @param {Error} [originalError] - Original error for debugging
   */
  constructor(message, type = 'UNKNOWN', originalError = null) {
    super(message);
    this.type = type;
    this.originalError = originalError;
    this.name = 'PredictionError';
  }

  isTimeout() { return this.type === 'TIMEOUT'; }
  isNetworkError() { return this.type === 'NETWORK'; }
  isValidationError() { return this.type === 'VALIDATION'; }
  isServerError() { return this.type === 'SERVER'; }
}

// ============================================================================
// NEW API: PredictionAdapter (Port Interface)
// ============================================================================

/**
 * Abstract interface for prediction adapters.
 * Implementations handle HTTP, mock, or other transports.
 */
export class PredictionAdapter {
  /**
   * Send prediction request.
   * @param {File} file - Image file
   * @param {Object} config - { timeout, maxRetries, ...adapter-specific }
   * @returns {Promise<{predicted_class: string, confidence: number}>}
   * @throws {PredictionError}
   */
  async predict(file, config) {
    throw new Error('predict() must be implemented');
  }
}

// ============================================================================
// NEW API: HttpPredictionAdapter (Production Adapter)
// ============================================================================

/**
 * HTTP transport adapter with retries and error mapping.
 */
export class HttpPredictionAdapter extends PredictionAdapter {
  constructor(baseUrl = 'http://localhost:8000') {
    super();
    this.baseUrl = baseUrl;
  }

  async predict(file, config) {
    const { timeout = 15000, maxRetries = 2 } = config;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this._fetchWithTimeout(file, timeout);
      } catch (error) {
        lastError = error;
        if (!this._isRetryable(error)) {
          throw this._mapError(error);
        }
        // Exponential backoff: 1s, 2s, 4s, etc.
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw this._mapError(lastError);
  }

  async _fetchWithTimeout(file, timeout) {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this._validateResponse(data);
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  _validateResponse(data) {
    if (!data || typeof data.predicted_class !== 'string') {
      throw new Error('Malformed response: missing predicted_class');
    }
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      throw new Error('Malformed response: invalid confidence');
    }
  }

  _isRetryable(error) {
    // Don't retry on abort (timeout), validation, or client errors
    if (error.name === 'AbortError') return false;
    if (error.message?.includes('Malformed')) return false;
    // Retry on network errors and 5xx
    return true;
  }

  _mapError(error) {
    if (error.name === 'AbortError') {
      return new PredictionError(
        'Request timed out! The backend model took too long to respond.',
        'TIMEOUT',
        error
      );
    }

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return new PredictionError(
        'Cannot reach the AI prediction server. Please make sure the backend is running.',
        'NETWORK',
        error
      );
    }

    if (error.message?.includes('Malformed')) {
      return new PredictionError(
        'The AI model server returned an invalid response.',
        'VALIDATION',
        error
      );
    }

    if (error.message?.includes('HTTP 422')) {
      return new PredictionError(
        'The uploaded file was rejected by the server as invalid data.',
        'VALIDATION',
        error
      );
    }

    // Check for 5xx server errors
    if (error.message?.includes('HTTP 5')) {
      return new PredictionError(
        'The AI model server encountered an internal error processing your image.',
        'SERVER',
        error
      );
    }

    // Check for any other HTTP errors (treat as network)
    if (error.message?.includes('HTTP ')) {
      return new PredictionError(
        'Server error: ' + error.message,
        'SERVER',
        error
      );
    }

    return new PredictionError(
      'An unexpected error occurred while contacting the AI model.',
      'UNKNOWN',
      error
    );
  }
}

// ============================================================================
// NEW API: MockPredictionAdapter (Testing Adapter)
// ============================================================================

/**
 * In-memory mock adapter for testing (no network calls).
 */
export class MockPredictionAdapter extends PredictionAdapter {
  constructor(responseMap = {}) {
    super();
    this.responseMap = responseMap;
    this.callCount = 0;
    this.lastFile = null;
  }

  async predict(file, config) {
    this.callCount++;
    this.lastFile = file;

    // Simulate network delay
    await new Promise(r => setTimeout(r, 50));

    const response = this.responseMap[file.name];
    if (!response) {
      throw new PredictionError(
        `Mock: no response configured for ${file.name}`,
        'VALIDATION'
      );
    }

    return response;
  }

  // Test utilities
  getCallCount() { return this.callCount; }
  getLastFile() { return this.lastFile; }
  reset() { 
    this.callCount = 0;
    this.lastFile = null;
  }
}

// ============================================================================
// NEW API: PredictionService (Facade)
// ============================================================================

/**
 * Prediction service facade. Hides HTTP details and adapter swapping.
 */
export class PredictionService {
  /**
   * Create a prediction service with optional adapter and config.
   * @param {PredictionAdapter} [adapter] - Defaults to HttpPredictionAdapter
   * @param {Object} [config] - { timeout: 15000, maxRetries: 2, baseUrl: 'http://localhost:8000' }
   */
  constructor(adapter = null, config = {}) {
    this.adapter = adapter || new HttpPredictionAdapter(config.baseUrl);
    this.config = { timeout: 15000, maxRetries: 2, ...config };
  }

  /**
   * Send image file for prediction.
   * @param {File} file - Image file
   * @returns {Promise<{predicted_class: string, confidence: number}>}
   * @throws {PredictionError}
   */
  async predict(file) {
    return this.adapter.predict(file, this.config);
  }
}

// ============================================================================
// LEGACY API: Keep old sendPrediction for backwards compatibility (deprecated)
// ============================================================================

/**
 * @deprecated Use PredictionService instead
 */
export async function sendPrediction(file) {
  const service = new PredictionService();
  return service.predict(file);
}
