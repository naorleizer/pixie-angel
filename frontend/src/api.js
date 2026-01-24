// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEBUG = (import.meta.env.VITE_DEBUG === 'true') || (localStorage.getItem('pixie_debug') === 'true');

// Auth Token Management
const TOKEN_KEY = 'pixie_auth_token';

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getAuthToken();
}

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

  // Add Auth Token if available
  const token = getAuthToken();
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

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
      // Handle 401 Unauthorized (Token expired/invalid)
      if (response.status === 401) {
        clearAuthToken();
        // Optional: Redirect to login
        // window.location.href = '/login'; 
      }
      let errorData = null;
      let errorText = null;

      try {
        errorData = await response.json();
      } catch (parseError) {
        console.error('Failed to parse error response as JSON:', parseError);
        try {
          errorText = await response.text();
        } catch (textError) {
          console.error('Failed to read error response as text:', textError);
        }
      }

      const message =
        (errorData && errorData.message) ||
        errorText ||
        `API error: ${response.status} ${response.statusText}`;

      const error = new Error(message);
      error.statusCode = response.status;
      error.statusText = response.statusText;
      error.response = errorData;
      // Propagate server-provided diagnostics for debugging
      if (errorData) {
        error.serverMessage = errorData.message;
        error.errorCode = errorData.error || errorData.error_code;
        error.errorId = errorData.error_id;
      }
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    if (DEBUG) {
      console.error(`[API] ${config.method || 'GET'} ${url} failed:`, error);
    } else {
      // Avoid exposing technical details in production
      console.warn('API request failed.');
    }
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

// --- Auth API ---

export async function login(username, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

export async function register(username, email, password) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function getCurrentUser() {
  return apiRequest('/api/auth/me');
}

export async function getPersonas() {
  return apiRequest('/api/auth/personas');
}

// --- Chat API ---

export async function createChatSession(title = 'New Chat') {
  return apiRequest('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function getChatSessions() {
  return apiRequest('/api/chat/sessions');
}

export async function getChatHistory(sessionId) {
  return apiRequest(`/api/chat/sessions/${sessionId}`);
}

export async function sendChatMessage(sessionId, message, systemPrompt = null) {
  return apiRequest(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, system_prompt: systemPrompt }),
  });
}

// --- Data API ---

export async function getTransactions() {
  return apiRequest('/api/transactions');
}

export async function getCategories() {
  return apiRequest('/api/categories');
}

export async function updateTransactionCategory(id, category) {
  return apiRequest(`/api/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ category })
  });
}

// --- Challenge API ---

export async function getChallenges(filter = 'current') {
  return apiRequest(`/api/challenges?filter=${filter}`);
}

export async function getChallengeDetail(challengeId) {
  return apiRequest(`/api/challenges/${challengeId}`);
}

export async function createChallenge(data) {
  return apiRequest('/api/challenges', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function addChallengeUpdate(challengeId, amount, description) {
  return apiRequest(`/api/challenges/${challengeId}/updates`, {
    method: 'POST',
    body: JSON.stringify({ amount, description })
  });
}

export async function deleteChallenge(challengeId) {
  return apiRequest(`/api/challenges/${challengeId}`, {
    method: 'DELETE'
  });
}

export async function restoreChallenge(challengeId) {
  return apiRequest(`/api/challenges/${challengeId}/restore`, {
    method: 'POST'
  });
}

export async function purgeChallenge(challengeId) {
  return apiRequest(`/api/challenges/${challengeId}/purge`, {
    method: 'DELETE'
  });
}

export async function updateUserPreferences(preferences) {
  return apiRequest('/api/auth/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify(preferences)
  });
}