import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../utils/auth';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Features:
 * - Shows loading spinner while checking auth state
 * - Redirects to login if unauthenticated
 * - Supports admin-only routes with requireAdmin prop
 * 
 * Usage:
 * <ProtectedRoute>
 *   <MyOrdersPage />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute requireAdmin>
 *   <AdminDashboard />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    // In your App.js, handle navigation to login
    // This is a simple redirect - you can customize this
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'home' }, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Please login to access this page</Text>
      </View>
    );
  }

  // Check admin access
  if (requireAdmin && !user?.is_admin) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.message}>You don't have permission to access this page</Text>
      </View>
    );
  }

  // User is authenticated (and has admin access if required)
  return children;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#86868B',
  },
  message: {
    fontSize: 16,
    color: '#86868B',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 10,
  },
});

export default ProtectedRoute;
