# Google OAuth2 Client ID Setup Guide

This guide explains how to create and configure a Google OAuth2 client ID for the QuickERP Chrome extension.

## Prerequisites
- Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `IIT-KGP-ERP-Extension` (or your preferred name)
4. Click **"Create"**

### 2. Enable Required APIs
1. In the project dashboard, go to **"APIs & Services"** → **"Library"**
2. Search for and enable these APIs:
   - **Gmail API** - Required for reading OTP emails
   - **Google+ API** - Required for user profile information (userinfo.email, userinfo.profile scopes)
3. Click on each API and click **"Enable"**

> **Note**: Google+ API is needed even though it's deprecated, as it still handles the userinfo scopes used by Chrome extensions.

### 3. Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type (unless you have Google Workspace)
3. Click **"Create"**

#### Fill Required Information:
- **App name**: `QuickERP`
- **User support email**: Your email address
- **App logo**: (Optional) Upload extension icon
- **App domain**: Leave blank for Chrome extensions
- **Developer contact information**: Your email address

#### Add Scopes:
1. Click **"Add or Remove Scopes"**
2. Add these scopes:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `openid`
3. **Important**: In the scope justification field for `gmail.readonly`, add:
   > "Required to automatically read OTP verification codes from ERP system emails. Without this permission, the extension cannot function."
4. Click **"Update"**

#### Test Users (for development):
1. Click **"Add Users"**
2. Add your Gmail address and any other test users
3. Click **"Save and Continue"**

### 4. Create OAuth2 Client ID
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Chrome extension"** as application type
4. **Name**: `QuickERP Extension Client`
5. **Application ID**: Enter your Chrome extension ID
   - If you don't have it yet, use a placeholder like `abcdefghijklmnopqrstuvwxyzabcdef`
   - You can update this later after publishing/loading the extension

### 5. Get Your Client ID
1. After creation, copy the **Client ID** (format: `xxxxx.apps.googleusercontent.com`)
2. Update `manifest.json` in your extension:
```json
{
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile", 
      "https://www.googleapis.com/auth/gmail.readonly",
      "openid"
    ]
  }
}
```

### 6. Update Extension ID (if needed)
1. Load your extension in Chrome (Developer mode)
2. Copy the generated Extension ID
3. Go back to Google Cloud Console → Credentials
4. Edit your OAuth client and update the Application ID
5. Save changes

## Publishing Considerations

### For Development/Testing:
- Add test users to OAuth consent screen
- Extension works only for added test users
- No verification required

### For Public Release:
1. **Verification Required**: Google will review your app
2. **Privacy Policy**: Required for public apps
3. **App Verification**: May take several days
4. **Domain Verification**: If using custom domains

### Alternative: Web Application Client
If Chrome extension client causes issues:
1. Create **"Web application"** client instead
2. Add `chrome-extension://YOUR_EXTENSION_ID` to authorized origins
3. Web clients can be published publicly without verification

## Security Best Practices
- Never commit client secrets to code (Chrome extensions don't use secrets)
- Use minimal required scopes
- Regularly rotate credentials if compromised
- Monitor API usage in Google Cloud Console

## Troubleshooting

### Common Issues:
- **"This app isn't verified"**: Add yourself as test user or go through verification
- **"redirect_uri_mismatch"**: Ensure extension ID matches in OAuth client
- **"access_denied"**: Check if user is added to test users list
- **"invalid_client"**: Verify client ID in manifest.json

### Testing:
1. Load extension in Chrome Developer mode
2. Test OAuth flow with test user account
3. Check browser console for detailed error messages
4. Verify API calls in Network tab

## Support
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Chrome Extension OAuth](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
