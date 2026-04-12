# Quick Google OAuth Setup

## Get Your Google Client ID (5 minutes)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/apis/credentials

2. **Create a new project** (or select existing):
   - Click "Select a project" → "New Project"
   - Name it anything (e.g., "My App")
   - Click "Create"

3. **Configure OAuth consent screen**:
   - Click "OAuth consent screen" in left menu
   - Select "External" user type
   - Fill in:
     - App name: Your App Name
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - Skip "Scopes" section → Click "Save and Continue"
   - Skip "Test users" → Click "Save and Continue"

4. **Create OAuth Client ID**:
   - Click "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "Web Client"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/oauth-callback.html`
   - Click "Create"

5. **Copy your Client ID**:
   - It will look like: `123456789-abc123def456.apps.googleusercontent.com`
   - Copy this value

## Update SignUpPage.js

Open `F:\digitalcom\src\screens\auth\SignUpPage.js`

Find this line (around line 17):
```javascript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

Replace with your actual Client ID:
```javascript
const GOOGLE_CLIENT_ID = '123456789-abc123def456.apps.googleusercontent.com';
```

## Test It!

1. Refresh your sign-up page
2. Click "Continue with Google"
3. A popup will open showing **ALL your Google accounts**
4. Select any account
5. Grant permissions
6. You're signed in!

## What You Get

✅ Real Google authentication
✅ Multiple account selection
✅ User's real email and name
✅ Profile picture
✅ Secure OAuth 2.0 flow

## For GitHub & Apple

See `OAUTH_SETUP.md` for GitHub and Apple setup instructions.
