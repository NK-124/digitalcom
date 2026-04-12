import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { getCurrentUser, oauthLogin } from '../../utils/auth';

const AuthModal = ({ visible, onClose, onLogin }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        setSuccess(`Welcome back, ${user.name}!`);
      }
    };
    checkAuth();
  }, []);

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    setError('');
    
    try {
      // Demo credentials - in production, this would redirect to OAuth provider
      const demoEmail = `user@${provider.toLowerCase()}.com`;
      const demoName = `${provider} User`;
      
      const result = await oauthLogin(provider.toLowerCase(), demoEmail, demoName);
      
      if (result.success) {
        setSuccess(`Welcome, ${result.user.name}!`);
        onLogin(result.user);
        onClose();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <button onClick={onClose} style={styles.closeButton}>×</button>

          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {success ? (
            <View style={styles.successMessage}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorMessage}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, loading && styles.disabledButton]}
              onPress={() => handleOAuthSignIn('Google')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1D1D1F" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                    style={styles.socialIcon}
                  />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, loading && styles.disabledButton]}
              onPress={() => handleOAuthSignIn('GitHub')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1D1D1F" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://github.com/favicon.ico' }}
                    style={styles.socialIcon}
                  />
                  <Text style={styles.socialButtonText}>Continue with GitHub</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, loading && styles.disabledButton]}
              onPress={() => handleOAuthSignIn('Apple')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1D1D1F" />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'auto',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 20,
    fontSize: 32,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#86868B',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  subtitle: {
    fontSize: 15,
    color: '#86868B',
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  errorMessage: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  successMessage: {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  successText: {
    fontSize: 14,
    color: '#16A34A',
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    border: '1px solid #D2D2D7',
    cursor: 'pointer',
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  appleIcon: {
    fontSize: 20,
    marginRight: 12,
    fontWeight: '700',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});

export default AuthModal;
