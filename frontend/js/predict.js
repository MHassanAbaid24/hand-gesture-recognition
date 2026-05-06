/**
 * Predict API Integration Module
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * Send hand gesture image file to backend prediction endpoint
 * @param {File} file - The image file to predict
 * @returns {Promise<{ predicted_class: string, confidence: number }>}
 */
export async function sendPrediction(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // Timeout after 15 seconds
      timeout: 15000
    });

    if (response.data && response.data.predicted_class !== undefined) {
      return response.data;
    } else {
      throw new Error('Malformed API response received');
    }
  } catch (error) {
    console.error('API Prediction Error:', error);
    
    let errorMsg = 'An unexpected error occurred while contacting the AI model.';
    if (error.code === 'ECONNABORTED') {
      errorMsg = 'Request timed out! The backend model took too long to respond.';
    } else if (!error.response) {
      errorMsg = 'Cannot reach the AI prediction server. Please make sure the backend is running at http://localhost:8000.';
    } else if (error.response.status >= 500) {
      errorMsg = 'The AI model server encountered an internal error processing your image.';
    } else if (error.response.status === 422) {
      errorMsg = 'The uploaded file was rejected by the server as invalid data.';
    }

    throw new Error(errorMsg);
  }
}
