import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions, ScrollView } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import { getCookie, setCookie, removeCookie } from '../../utils/cookies';

const SignUpPage = ({ onNavigate, onSignUp }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [oauthData, setOauthData] = useState(null);

  // ===== OAuth Client IDs - MUST MATCH backend/.env =====
  const GOOGLE_CLIENT_ID = '795926479099-6hc86qh6n3rccbs8ske3rl0udjbq8rla.apps.googleusercontent.com';
  const GITHUB_CLIENT_ID = 'Ov23lixaFCm4diOzw9kt';
  // =====================================================

  const getProviderPermissions = (provider) => {
    switch (provider) {
      case 'Google':
        return ['View your email address', 'View your basic profile information', 'View your name and profile picture'];
      case 'GitHub':
        return ['Access your public repositories', 'View your email address', 'View your profile information'];
      default:
        return [];
    }
  };

  // Send token to backend for verification (background sync)
  const authenticateWithBackend = async (provider, credentials) => {
    try {
      fetch(`http://localhost:8000/api/auth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials)
      }).catch(err => console.error("Background sync failed:", err));
    } catch (err) {
      console.error('Backend fetch error:', err);
    }
  };

  // Optimistic login - waits for backend to set session cookies, then redirects
  const handleOptimisticLogin = async (provider, oauthData) => {
    // Clear old session first
    removeCookie('digitalcom_user');
    
    try {
      // Wait for backend to set HTTP-only session cookies
      await fetch(`http://localhost:8000/api/auth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(oauthData)
      });
    } catch (err) {
      console.error('Backend login failed:', err);
    }
    
    const user = {
      id: Date.now(),
      name: oauthData?.name || `${provider} User`,
      email: oauthData?.email || `user@${provider.toLowerCase()}.com`,
      provider: provider.toLowerCase(),
      picture: oauthData?.picture,
      is_admin: false,
      createdAt: new Date().toISOString()
    };
    
    authenticateWithBackend(provider, oauthData);
    handleSuccess(user);
  };

  const handleSuccess = (user) => {
    setCookie('digitalcom_user', JSON.stringify(user));
    setSuccess(`Welcome, ${user.name}!`);
    setError('');
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.history.pushState({ page: 'home' }, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }, 500);
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'Google': return 'https://www.google.com/favicon.ico';
      case 'GitHub': return 'https://github.com/favicon.ico';
      default: return null;
    }
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      const width = 500, height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/oauth-callback.html')}&response_type=id_token&scope=email%20profile%20openid&nonce=${Date.now()}`;

      const popup = window.open(googleAuthUrl, 'Google Login', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,location=no`);

      const handleMessage = (event) => {
        if (event.data?.type === 'oauth-success' && event.data.provider === 'Google') {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          handleOptimisticLogin('google', { id_token: event.data.id_token, name: event.data.name, email: event.data.email, picture: event.data.picture, provider_id: event.data.provider_id });
        } else if (event.data?.type === 'oauth-error' && event.data.provider === 'Google') {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          setError(event.data.error || 'Google authentication failed');
        }
      };
      window.addEventListener('message', handleMessage);
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) { clearInterval(checkPopupClosed); window.removeEventListener('message', handleMessage); }
      }, 500);
      setTimeout(() => { clearInterval(checkPopupClosed); window.removeEventListener('message', handleMessage); if (popup && !popup.closed) popup.close(); setError('Google authentication timeout'); }, 300000);
    } catch (err) { setError(err.message || 'Google sign-in failed'); }
  };

  // GitHub OAuth
  const handleGitHubSignIn = async () => {
    try {
      const width = 500, height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/oauth-callback.html?provider=GitHub')}&scope=user:email%20read:user&state=${Date.now()}`;

      const popup = window.open(githubAuthUrl, 'GitHub Login', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,location=no`);

      const handleMessage = (event) => {
        if (event.data?.type === 'oauth-success' && event.data.provider === 'GitHub') {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          handleOptimisticLogin('github', { code: event.data.code, name: event.data.name, email: event.data.email, picture: event.data.picture, provider_id: event.data.provider_id });
        } else if (event.data?.type === 'oauth-error' && event.data.provider === 'GitHub') {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          setError(event.data.error || 'GitHub authentication failed');
        }
      };
      window.addEventListener('message', handleMessage);
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) { clearInterval(checkPopupClosed); window.removeEventListener('message', handleMessage); }
      }, 500);
      setTimeout(() => { clearInterval(checkPopupClosed); window.removeEventListener('message', handleMessage); if (popup && !popup.closed) popup.close(); setError('GitHub authentication timeout'); }, 300000);
    } catch (err) { setError(err.message || 'GitHub sign-in failed'); }
  };

  // OAuth popup window handler
  const openOAuthPopup = (provider) => {
    return new Promise((resolve, reject) => {
      const savedEmails = JSON.parse(getCookie('digitalcom_saved_emails') || '[]');
      const emailsHtml = savedEmails.map(email => `<div class="account-btn" onclick="selectEmail('${email}')">${email}</div>`).join('');
      const popupHtml = `<!DOCTYPE html><html><head><title>Sign in with ${provider}</title><style>body{font-family:-apple-system,sans-serif;padding:20px;background:#f5f5f7}h2{text-align:center;color:#1D1D1F}.subtitle{text-align:center;color:#86868B;font-size:14px;margin-bottom:20px}.account-btn{display:block;width:100%;padding:15px;margin:8px 0;border:1px solid #D2D2D7;border-radius:12px;background:white;cursor:pointer}.email-input{width:100%;padding:12px;border:1px solid #D2D2D7;border-radius:8px;font-size:16px;margin:8px 0;box-sizing:border-box}.continue-btn{width:100%;padding:16px;background:#0066CC;color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;margin-top:20px;cursor:pointer}</style></head><body><h2>Sign in with ${provider}</h2><p class="subtitle">Choose an account or enter a new email</p>${emailsHtml ? `<div style="margin-bottom:15px">${emailsHtml}</div><div style="text-align:center;margin:20px 0;color:#86868B">-- OR --</div>` : ''}<label>Email:</label><input type="email" id="email" class="email-input" placeholder="your.email@gmail.com" /><label>Name:</label><input type="text" id="name" class="email-input" placeholder="Your Name" /><button class="continue-btn" onclick="submitForm()">Continue</button><script>function selectEmail(e){document.getElementById('email').value=e;document.getElementById('name').focus()}function submitForm(){var e=document.getElementById('email').value,t=document.getElementById('name').value;if(!e||!t){alert('Please enter both email and name');return}if(!e.includes('@')){alert('Please enter a valid email');return}window.opener.postMessage({type:'oauth-success',provider:'${provider}',email:e,name:t,provider_id:Date.now().toString()},window.location.origin);document.body.innerHTML='<div style=text-align:center;padding:40px><h2 style=color:#34C759>Success!</h2><p>Signing you in...</p></div>';setTimeout(()=>window.close(),1500)}document.addEventListener('keypress',function(e){if(e.key==='Enter')submitForm()})<\/script></body></html>`;

      const width = 500, height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      const popup = window.open('about:blank', `${provider} Login`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
      popup.document.write(popupHtml);
      popup.document.close();

      const handleMessage = (event) => {
        if (event.data?.type === 'oauth-success' && event.data.provider === provider) {
          window.removeEventListener('message', handleMessage);
          if (event.data.emails) setCookie('digitalcom_saved_emails', JSON.stringify(event.data.emails));
          resolve(event.data);
        } else if (event.data?.type === 'oauth-error') {
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error || 'Authentication failed'));
        }
      };
      window.addEventListener('message', handleMessage);
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) { clearInterval(checkPopupClosed); window.removeEventListener('message', handleMessage); }
      }, 500);
      setTimeout(() => { clearInterval(checkPopupClosed); window.removeEventListener('message', handleMessage); if (popup && !popup.closed) popup.close(); reject(new Error('Authentication timeout')); }, 300000);
    });
  };

  const confirmSignIn = async () => {
    setShowPermissionModal(false);
    handleSuccess({ name: oauthData?.name || 'User', email: oauthData?.email, provider: selectedProvider.toLowerCase() });
    try {
      fetch(`http://localhost:8000/api/auth/${selectedProvider.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: oauthData?.email, name: oauthData?.name, provider_id: oauthData?.provider_id, picture: oauthData?.picture })
      }).catch(err => console.error("Background sync failed:", err));
    } catch (err) { console.error('Fetch error:', err); }
  };

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      <View style={styles.content}>
        <View style={styles.signUpContainer}>
          <button onClick={handleGoBack} style={styles.backButton}>← Back</button>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
          {success ? <View style={styles.successMessage}><Text style={styles.successText}>{success}</Text></View> : null}
          {error ? <View style={styles.errorMessage}><Text style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.socialButtons}>
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
              <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={handleGitHubSignIn}>
              <Image source={{ uri: 'https://github.com/favicon.ico' }} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Continue with GitHub</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.termsText}>By continuing, you agree to our Terms of Service and Privacy Policy</Text>
        </View>
      </View>

      {/* Permission Modal */}
      <Modal visible={showPermissionModal} transparent={true} animationType="fade" onRequestClose={() => setShowPermissionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.permissionModal}>
            <View style={styles.providerHeader}>
              <Image source={{ uri: getProviderIcon(selectedProvider) }} style={styles.providerIcon} />
              <Text style={styles.providerName}>{selectedProvider}</Text>
            </View>
            <Text style={styles.permissionTitle}>{selectedProvider} wants to access your account</Text>
            <View style={styles.permissionsList}>
              {permissions.map((permission, index) => (
                <View key={index} style={styles.permissionItem}>
                  <Text style={styles.permissionCheck}>✓</Text>
                  <Text style={styles.permissionText}>{permission}</Text>
                </View>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPermissionModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.allowButton} onPress={confirmSignIn}>
                <Text style={styles.allowButtonText}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 15 },
  signUpContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 25, width: '90%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  backButton: { background: 'none', border: 'none', fontSize: 16, color: '#0066CC', cursor: 'pointer', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1D1D1F', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#86868B', textAlign: 'center', marginBottom: 25 },
  errorMessage: { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, marginBottom: 20 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  successMessage: { backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 12, marginBottom: 20 },
  successText: { fontSize: 14, color: '#16A34A', textAlign: 'center' },
  socialButtons: { gap: 10, width: '100%' },
  socialButton: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 10, border: '1px solid #D2D2D7', cursor: 'pointer', marginBottom: 8 },
  socialIcon: { width: 20, height: 20, marginRight: 12 },
  socialButtonText: { fontSize: 15, fontWeight: '500', color: '#1D1D1F' },
  termsText: { fontSize: 12, color: '#86868B', textAlign: 'center', marginTop: 30, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  permissionModal: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '90%', maxWidth: 400 },
  providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
  providerIcon: { width: 32, height: 32, marginRight: 12 },
  providerName: { fontSize: 24, fontWeight: '700', color: '#1D1D1F' },
  permissionTitle: { fontSize: 18, fontWeight: '600', color: '#1D1D1F', marginBottom: 20, textAlign: 'center' },
  permissionsList: { backgroundColor: '#F5F5F7', borderRadius: 12, padding: 20, marginBottom: 15 },
  permissionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  permissionCheck: { fontSize: 16, color: '#34C759', marginRight: 12, fontWeight: '700' },
  permissionText: { fontSize: 14, color: '#1D1D1F' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center', border: '1px solid #D2D2D7' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#1D1D1F' },
  allowButton: { flex: 1, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  allowButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

export default SignUpPage;
