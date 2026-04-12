import { useState, useEffect, useCallback } from 'react';
import { apiClient, authEvents } from './apiClient';

const API_URL = 'http://localhost:8000';

/**
 * Get current authenticated user from JWT token in backend
 * Returns user object or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
    return await apiClient('/api/auth/me');
  } catch (error) {
    // 401 means not authenticated - this is expected
    if (error.message === 'SESSION_EXPIRED' || error.message === 'FORBIDDEN') {
      return null;
    }
    console.error('Error fetching current user:', error);
    return null;
  }
};

/**
 * Login user with email
 * Backend will set JWT cookies automatically
 */
export const login = async (email) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, user: data.user };
    }

    const error = await response.json();
    return { success: false, error: error.detail || error.message || 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Register new user
 * Backend will set JWT cookies automatically
 */
export const register = async (email, name, provider = 'manual') => {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, provider }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, user: data.user };
    }

    const error = await response.json();
    return { success: false, error: error.detail || error.message || 'Registration failed' };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Logout user - Backend clears cookies, frontend resets state
 */
export const logout = async () => {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

/**
 * OAuth login (Google, GitHub, Apple)
 * Backend will set JWT cookies automatically
 */
export const oauthLogin = async (provider, email, name) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/${provider}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, email, name }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, user: data.user };
    }

    const error = await response.json();
    return { success: false, error: error.message || 'OAuth login failed' };
  } catch (error) {
    console.error(`${provider} login error:`, error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const user = await getCurrentUser();
  return user !== null;
};

/**
 * React hook to get current user with loading state
 * Features:
 * - Restores session on app load
 * - Handles token expiration gracefully
 * - Listens for global auth events (session expired)
 * - Prevents UI flicker with proper loading state
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for session expired events from apiClient
  useEffect(() => {
    const handleSessionExpired = (event) => {
      setUser(null);
      setLoading(false);
      // Optional: show toast notification here
      console.log('Session expired:', event.detail?.message);
    };

    authEvents.addListener(authEvents.SESSION_EXPIRED, handleSessionExpired);

    return () => {
      authEvents.removeListener(authEvents.SESSION_EXPIRED, handleSessionExpired);
    };
  }, []);

  return { 
    user, 
    loading, 
    isAuthenticated: user !== null, 
    refreshUser: loadUser 
  };
};
