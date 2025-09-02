# QuickERP

Fast, secure login for IIT Kharagpur ERP with automated OTP retrieval.

## 🚀 Features

- **Fully Automated Login**: One-click ERP access after initial setup
- **Gmail OTP Integration**: Automatic OTP retrieval from Gmail using OAuth2
- **Secure Storage**: AES-GCM encrypted credential storage
- **Modern UI**: Dark theme with glass morphism and smooth animations
- **Multi-Screen Interface**: Setup wizard, dashboard, login progress, and settings
- **Responsive Design**: Works on screens from 320px to 1200px
- **Security Questions**: Dynamic handling of custom security Q&A pairs

## 📋 Prerequisites

- Chrome browser (Manifest V3 compatible)
- Google Cloud Console project with Gmail API enabled
- IIT KGP ERP account credentials

## 🛠️ Installation & Setup

### 1. Google OAuth2 Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth2 credentials (Desktop application type)
5. Add your Chrome extension ID to authorized origins
6. Copy the Client ID

### 2. Extension Installation
1. Clone/download this repository
2. Open `manifest.json` and replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (top right toggle)
5. Click "Load unpacked" and select the `extension` folder
6. Note the extension ID from the loaded extension

### 3. First-Time Setup
1. Click the extension icon to open the window
2. Complete the setup wizard:
   - Enter your ERP roll number and password
   - Add your security questions and answers
   - Connect your Gmail account (OAuth2 flow)
3. Setup is complete when you see the dashboard

## 🎯 Usage

### Automated Login
1. Open the extension window
2. Click "Login to ERP" on the dashboard
3. Watch the progress as it automatically:
   - Submits credentials
   - Answers security questions
   - Retrieves OTP from Gmail
   - Completes authentication
4. Click "Open ERP (Authenticated)" to access your session
- No plain text password storage
- Minimal permissions requested

## Requirements

- Chrome browser with Manifest V3 support
- Gmail account for OTP retrieval
- Valid IIT KGP ERP credentials

## Privacy

- No data sent to external servers
- All processing done locally
- Gmail access only for OTP emails from erp.iitkgp.ac.in
