import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { authEvents } from '../utils/apiClient';

/**
 * GlobalErrorHandler - Shows user-friendly error messages
 * Listens to authEvents and displays toast-like notifications
 * 
 * Place this once in App.js at the root level
 */
const GlobalErrorHandler = () => {
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleError = (event) => {
      const message = event.detail?.message || 'Something went wrong';
      showError(message);
    };

    // Listen to all error events
    authEvents.addListener(authEvents.SESSION_EXPIRED, handleError);
    authEvents.addListener(authEvents.NETWORK_ERROR, handleError);
    authEvents.addListener(authEvents.SERVER_ERROR, handleError);

    return () => {
      authEvents.removeListener(authEvents.SESSION_EXPIRED, handleError);
      authEvents.removeListener(authEvents.NETWORK_ERROR, handleError);
      authEvents.removeListener(authEvents.SERVER_ERROR, handleError);
    };
  }, []);

  const showError = (message) => {
    setError(message);
    setVisible(true);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setVisible(false);
      setError(null);
    }, 5000);
  };

  if (!visible || !error) {
    return null;
  }

  const isError = error.includes('expired') || error.includes('login');
  const isNetwork = error.includes('Network');

  return (
    <View style={[styles.container, isError && styles.errorContainer, isNetwork && styles.networkContainer]}>
      <Text style={styles.message}>{error}</Text>
      <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    backgroundColor: '#F5F5F7',
    padding: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    border: '1px solid #D2D2D7',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
  },
  networkContainer: {
    backgroundColor: '#FFF7ED',
    border: '1px solid #FED7AA',
  },
  message: {
    fontSize: 14,
    color: '#1D1D1F',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#86868B',
    fontWeight: '300',
  },
});

export default GlobalErrorHandler;
