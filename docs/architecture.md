# Architecture

```
extension/
├── manifest.json
└── src/
    ├── background.js
    ├── window/
    │   ├── index.html
    │   ├── erp.js
    │   ├── components/
    │   │   └── navbar.html
    │   ├── screens/
    │   │   ├── setup.html
    │   │   ├── dashboard.html
    │   │   ├── login.html
    │   │   └── settings.html
    │   └── styles/
    │       ├── main.css
    │       ├── components.css
    │       ├── navbar.css
    │       ├── screens.css
    │       └── animations.css
    ├── controllers/
    │   ├── AppController.js
    │   ├── NavController.js
    │   ├── SetupController.js
    │   ├── LoginController.js
    │   └── SettingsController.js
    ├── services/
    │   ├── CredentialService.js
    │   ├── ERPApiService.js
    │   ├── GmailService.js
    │   └── StorageService.js
    ├── config/
    │   └── constants.js
    └── assets/
        ├── icons/
        │   ├── icon16.png
        │   ├── icon48.png
        │   └── icon128.png
        └── images/
            └── iitkgp-logo.png

```

## Architecture Overview

### **Background Script**
- Background script creates window

### **Window Context**
- Window handles all UI
- All business logic and UI handled in window context
- Controllers for proper separation of concerns
- Services for data layer abstraction
- Modular screens and components

### **Core Layers**

#### **Controllers** (Business Logic)
- Controllers handle business logic
- `AppController.js` - Main orchestration
- `NavController.js` - Navigation & routing
- `SetupController.js` - Setup wizard
- `LoginController.js` - Login workflow
- `SettingsController.js` - Settings management

#### **Services** (Data Layer)
- Services handle data and APIs
- `CredentialService.js` - Secure storage
- `ERPApiService.js` - ERP API calls
- `GmailService.js` - OAuth2 & OTP
- `StorageService.js` - Chrome storage

## Data Flow

```
User Action → Controller → Service → API → Response → Controller → UI Update
