# OAuth Setup Guide

This guide will help you configure Google, GitHub, and Apple OAuth authentication for your application.

## Overview

The application now supports **real OAuth authentication** which allows users to:
- Select from multiple Google accounts
- Select from multiple GitHub accounts  
- Select from multiple Apple IDs

When a user clicks "Continue with [Provider]", a popup window opens showing the provider's account selection screen.

## Setup Instructions

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen:
   - User Type: External
   - App name: Your App Name
   - Authorized domains: `localhost` (for development)
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
7. Copy your **Client ID** and update `SignUpPage.js`:
   ```javascript
   Google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&...
   ```

### 2. GitHub OAuth Setup

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: Your App Name
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
4. Copy your **Client ID** and update `SignUpPage.js`:
   ```javascript
   GitHub: `https://github.com/login/oauth/authorize?client_id=YOUR_GITHUB_CLIENT_ID&...
   ```
5. (Optional) Generate a Client Secret for backend token exchange

### 3. Apple Sign In Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Create a new App ID with "Sign in with Apple" capability
3. Create a Service ID:
   - Configure for "Sign in with Apple"
   - Add redirect URL: `http://localhost:3000/api/auth/apple/callback`
4. Create a Key ID for authentication
5. Update `SignUpPage.js`:
   ```javascript
   Apple: `https://appleid.apple.com/auth/authorize?client_id=YOUR_APPLE_SERVICE_ID&...
   ```

## Testing

### Without OAuth Credentials (Development Mode)

If you haven't configured OAuth credentials yet, the app will fall back to demo authentication:
- Users can still test the signup flow
- Account data is stored in localStorage
- No real OAuth popup will appear

### With OAuth Credentials

1. Start the frontend: `npm start`
2. Navigate to sign-up page
3. Click "Continue with Google/GitHub/Apple"
4. A popup will open showing account selection
5. Select an account
6. Grant permissions
7. Popup closes and user is signed in

## OAuth Flow

```
User clicks "Continue with X"
    ↓
Popup opens with OAuth URL
    ↓
Provider shows account selection (multiple accounts supported!)
    ↓
User selects account and grants permission
    ↓
Provider redirects to callback with token/code
    ↓
Callback page extracts user info
    ↓
Sends data to main window via postMessage
    ↓
Popup closes
    ↓
User signed in!
```

## Security Notes

1. **Never commit OAuth credentials** to version control
2. Use environment variables for production:
   ```javascript
   const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
   ```
3. Configure proper redirect URIs for production
4. Enable HTTPS in production (required for OAuth)
5. Validate `postMessage` origin (already implemented)

## Troubleshooting

### Popup Blocked
- Ensure popup blocker is disabled for localhost
- Click must be user-initiated (not programmatic)

### "Invalid Client ID"
- Double-check Client ID in code
- Ensure OAuth app is properly configured
- Check redirect URI matches exactly

### "Redirect URI Mismatch"
- Redirect URI in OAuth provider settings must exactly match
- Include protocol (http/https) and port

### Account Selection Not Showing
- Add `prompt=select_account` to OAuth URL (already included)
- Clear browser cache/cookies for the provider
- Use incognito mode to test

## Backend OAuth Routes (To Be Implemented)

The frontend is ready. You'll need to implement these backend routes:

```python
# Google callback
POST /api/auth/google/callback

# GitHub token exchange
POST /api/auth/github/token

# Apple verification
POST /api/auth/apple/verify
```

## Production Deployment

For production, update:
1. OAuth redirect URIs to production domain
2. Use HTTPS (required by most providers)
3. Store Client IDs in environment variables
4. Configure CORS for production domain
5. Update `oauth-callback.html` to use production API URLs

## Additional Resources

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Docs](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Apple Sign In Docs](https://developer.apple.com/sign-in-with-apple/)
