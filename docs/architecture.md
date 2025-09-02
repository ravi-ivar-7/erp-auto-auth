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