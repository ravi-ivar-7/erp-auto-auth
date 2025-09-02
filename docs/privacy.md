# Privacy Policy - QuickERP

**Last Updated**: August 29, 2025  
**Version**: 1.0.0

## Overview

QuickERP is a Chrome extension designed to automate login to the IIT Kharagpur ERP system. This privacy policy explains how we handle your data with complete transparency and security.

## Data Collection

### What We Collect
- **ERP Credentials**: Username and password for IIT KGP ERP system
- **Security Questions**: Answers to ERP security questions
- **Gmail Access Token**: OAuth2 token for OTP retrieval (read-only access)
- **Extension Settings**: User preferences and configuration

### What We DON'T Collect
- Personal emails or email content (beyond OTP messages)
- Browsing history outside ERP domain
- Personal files or documents
- Any data unrelated to ERP login functionality

## Data Storage

### Local Storage Only
- **All data is stored locally** on your device using Chrome's secure storage API
- **AES-GCM encrypted storage** - credentials protected with military-grade encryption
- **No cloud storage** - your credentials never leave your computer
- **No external servers** - we don't operate any backend servers

## Data Usage

### Purpose Limitation
Your data is used **exclusively** for:
- Automating ERP login process
- Retrieving OTP messages from Gmail
- Storing user preferences for the extension

### No Third-Party Sharing
- **Zero data sharing** with third parties
- **No analytics tracking** or user behavior monitoring
- **No advertising** or marketing use of your data

## Permissions Explained

### Required Permissions
- **`storage`**: Store AES-GCM encrypted credentials locally
- **`tabs`**: Navigate to ERP login pages
- **`identity`**: Gmail OAuth2 authentication
- **`identity.email`**: Access your email address for account verification

### Host Permissions
- **`erp.iitkgp.ac.in`**: Access ERP website for automated login
- **`accounts.google.com`**: Gmail OAuth2 authentication
- **`gmail.googleapis.com`**: Read-only access to retrieve OTP emails

## Gmail Integration

### OAuth2 Scope
- **Read-only access** to Gmail for OTP retrieval only
- **No email sending** capabilities
- **No email modification** or deletion
- **Limited to OTP message detection** using specific filters

### Token Management
- OAuth2 tokens stored securely in Chrome's identity API
- Tokens automatically refreshed by Chrome
- Can be revoked anytime through Google Account settings

## Data Retention

### Automatic Cleanup
- **Session data** cleared after each login attempt
- **Temporary tokens** automatically expired
- **Error logs** cleared on extension restart

### User Control
- **Complete data deletion** available through extension settings
- **Selective credential removal** for individual accounts
- **Instant effect** - deletion is immediate and irreversible

## Security Measures

### Encryption
- **AES-GCM Encryption**: All sensitive credentials encrypted using AES-GCM algorithm
- **Local Key Management**: Encryption keys generated and stored locally on your device
- **No Plain Text Storage**: Passwords and tokens never stored in plain text
- **Automatic Decryption**: Data decrypted only when needed for authentication

### Access Controls
- **Local device only** - no remote access possible
- **Chrome security model** - isolated from other extensions
- **User authentication** required for sensitive operations
- **Encrypted storage** - even local data is protected with strong encryption

## User Rights

### Your Control
- **View all stored data** through extension interface
- **Delete any or all data** at any time
- **Revoke Gmail access** through Google Account settings
- **Uninstall extension** removes all local data

### Transparency
- **Open source code** available for review
- **No hidden functionality** - all features documented
- **Clear permission requests** with explanations

## Compliance

### Standards
- Follows **Chrome Extension security best practices**
- Compliant with **Google's privacy requirements**
- Adheres to **academic institution data policies**

### No Personal Data Processing
- Extension processes only authentication data
- No personal information beyond login credentials
- No behavioral tracking or profiling

## Contact & Support

### Issues or Questions
- **GitHub Issues**: Report bugs or privacy concerns
- **Code Review**: Full source code available for inspection
- **Documentation**: Comprehensive setup and usage guides

### Data Requests
Since all data is stored locally on your device:
- **Data export**: Use extension's backup feature
- **Data deletion**: Use extension's reset feature
- **Access logs**: Available through Chrome's extension logs

## Updates

### Policy Changes
- Privacy policy updates will be clearly communicated
- Major changes require user consent

### Extension Updates
- Automatic security updates through Chrome Web Store
- New features clearly documented with privacy implications
- User consent required for new permissions

---

**Remember**: Your privacy and security are our top priorities. This extension is designed to enhance your ERP experience while keeping your data completely under your control.
