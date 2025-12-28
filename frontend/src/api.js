// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Make a request to the Flask backend
 * @param {string} endpoint - API endpoint (e.g., '/api/chat')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} - Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Check if the backend is healthy
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const data = await apiRequest('/health');
    return data.status === 'healthy';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

// TODO: Add specific API functions when endpoints are implemented
// Examples:

/**
 * Send a chat message to the LLM
 * @param {string} message - User message
 * @param {object} context - Chat context (history, user state, etc.)
 * @returns {Promise<object>} - LLM response
 */
export async function sendChatMessage(message, context = {}) {
  // TODO: Implement when /api/chat endpoint is ready
  return apiRequest('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  });
}

/**
 * Create a new savings challenge
 * @param {object} challengeData - Challenge details
 * @returns {Promise<object>} - Created challenge
 */
export async function createChallenge(challengeData) {
  // TODO: Implement when /api/challenge endpoint is ready
  return apiRequest('/api/challenge', {
    method: 'POST',
    body: JSON.stringify(challengeData),
  });
}

/**
 * Get budget suggestions from LLM
 * @param {object} budgetData - Current budget and spending data
 * @returns {Promise<object>} - Budget suggestions
 */
export async function getBudgetSuggestions(budgetData) {
  // TODO: Implement when /api/budget endpoint is ready
  return apiRequest('/api/budget', {
    method: 'POST',
    body: JSON.stringify(budgetData),
  });
}
