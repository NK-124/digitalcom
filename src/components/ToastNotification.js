import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    const newToast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);

    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message) => showToast(message, 'error'), [showToast]);
  const warning = useCallback((message) => showToast(message, 'warning'), [showToast]);
  const info = useCallback((message) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 400 }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return { backgroundColor: '#10B981', icon: '✓' };
      case 'error':
        return { backgroundColor: '#EF4444', icon: '✕' };
      case 'warning':
        return { backgroundColor: '#F59E0B', icon: '⚠' };
      case 'info':
        return { backgroundColor: '#3B82F6', icon: 'ℹ' };
      default:
        return { backgroundColor: '#10B981', icon: '✓' };
    }
  };

  const style = getToastStyle();

  return (
    <TouchableOpacity 
      style={[styles.toast, { backgroundColor: style.backgroundColor }]} 
      onPress={onRemove} 
      activeOpacity={0.8}
    >
      <View style={styles.toastContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{style.icon}</Text>
        </View>
        <Text style={styles.toastMessage}>{toast.message}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toastContainerWrapper: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 9999,
    maxWidth: 400,
  },
  toast: {
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minWidth: 300,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toastMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    paddingRight: 10,
  },
});

export default ToastProvider;
