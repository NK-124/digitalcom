const API_URL = 'http://localhost:8000';

// Event system for global error handling
const eventTarget = new EventTarget();

export const authEvents = {
  SESSION_EXPIRED: 'session_expired',
  NETWORK_ERROR: 'network_error',
  SERVER_ERROR: 'server_error',
  addListener: (event, callback) => {
    eventTarget.addEventListener(event, callback);
  },
  removeListener: (event, callback) => {
    eventTarget.removeEventListener(event, callback);
  },
  dispatch: (event, detail) => {
    eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
  }
};

// ========== REFRESH TOKEN LOCK (prevent race conditions) ==========
let refreshPromise = null;
let isRefreshing = false;

/**
 * Refresh access token using refresh token cookie
 * Prevents concurrent refresh requests (race condition fix)
 */
const refreshAccessToken = async () => {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Mark as refreshing
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Refresh failed - user needs to login again
        authEvents.dispatch(authEvents.SESSION_EXPIRED, {
          message: 'Session expired, please login again'
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      authEvents.dispatch(authEvents.SESSION_EXPIRED, {
        message: 'Session expired, please login again'
      });
      return false;
    } finally {
      // Reset refresh state
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Centralized API client with automatic token refresh
 * Usage:
 *   const data = await apiClient('/api/user/orders');
 *   const result = await apiClient('/api/orders', { method: 'POST', body: {...} });
 */
export const apiClient = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    retryOn401 = true, // Enable automatic token refresh
  } = options;

  const config = {
    method,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    let response = await fetch(`${API_URL}${endpoint}`, config);

    // Handle 401 - try to refresh token and retry
    if (response.status === 401 && retryOn401) {
      const refreshed = await refreshAccessToken();
      
      if (refreshed) {
        // Retry the original request with new token
        response = await fetch(`${API_URL}${endpoint}`, config);
      } else {
        // Refresh failed - throw with session expired error
        throw new Error('SESSION_EXPIRED');
      }
    }

    // Handle network errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 403 - Forbidden
      if (response.status === 403) {
        throw new Error('FORBIDDEN');
      }
      
      // 404 - Not Found
      if (response.status === 404) {
        throw new Error('NOT_FOUND');
      }
      
      // 500 - Server Error
      if (response.status >= 500) {
        authEvents.dispatch(authEvents.SERVER_ERROR, {
          message: 'Server error, please try again later'
        });
        throw new Error('SERVER_ERROR');
      }

      // Other errors
      throw new Error(errorData.detail || errorData.message || 'Request failed');
    }

    // Parse and return response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return response;
  } catch (error) {
    // Network error
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      authEvents.dispatch(authEvents.NETWORK_ERROR, {
        message: 'Network error, please check your connection'
      });
      throw new Error('NETWORK_ERROR');
    }

    // Re-throw known errors
    throw error;
  }
};

/**
 * File upload helper (uses FormData, not JSON)
 */
export const apiUpload = async (endpoint, formData, options = {}) => {
  const { method = 'POST' } = options;

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      credentials: 'include',
      body: formData, // FormData, not JSON
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
