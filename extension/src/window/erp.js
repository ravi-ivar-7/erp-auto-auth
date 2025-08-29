import { AppController } from '../controllers/AppController.js';
import { NavController } from '../controllers/NavController.js';
import { SetupController } from '../controllers/SetupController.js';
import { LoginController } from '../controllers/LoginController.js';
import { SettingsController } from '../controllers/SettingsController.js';
import { DashboardController } from '../controllers/DashboardController.js';

class ERPApp {
    constructor() {
        this.controllers = {};
        this.currentScreen = null;
        this.init();
    }

    async init() {
        try {
            await this.initializeControllers();
            await this.loadInitialScreen();
            this.setupGlobalEventListeners();
        } catch (error) {
            console.error('Failed to initialize ERP app:', error);
            this.showError('Failed to initialize application');
        }
    }

    async initializeControllers() {
        this.controllers = {
            app: new AppController(this),
            nav: new NavController(this),
            setup: new SetupController(this),
            login: new LoginController(this),
            settings: new SettingsController(this),
            dashboard: new DashboardController(this)
        };

        await Promise.all(
            Object.values(this.controllers).map(controller => 
                controller.init?.()
            )
        );
    }

    async loadInitialScreen() {
        const validation = await this.controllers.app.isValidSetup();
        const initialScreen = validation.isValid ? 'dashboard' : 'setup';
        await this.navigateToScreen(initialScreen);
    }

    async navigateToScreen(screenName, data = {}) {
        try {
            const screenContainer = document.getElementById('screen-container');
            const navContainer = document.getElementById('navbar-container');

            if (screenName === 'setup' || screenName === 'login') {
                navContainer.style.display = 'none';
            } else {
                navContainer.style.display = 'block';
                await this.controllers.nav.loadNavbar();
                this.controllers.nav.setActiveScreen(screenName);
            }

            const response = await fetch(`screens/${screenName}.html`);
            if (!response.ok) throw new Error(`Failed to load ${screenName} screen`);
            
            const html = await response.text();
            screenContainer.innerHTML = html;
            screenContainer.className = 'animate-fade-in';

            this.currentScreen = screenName;
            
            const controller = this.controllers[screenName];
            if (controller?.onScreenLoad) {
                await controller.onScreenLoad(data);
            }

        } catch (error) {
            console.error(`Failed to navigate to ${screenName}:`, error);
            this.showError(`Failed to load ${screenName} screen`);
        }
    }

    setupGlobalEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-screen]')) {
                const screen = e.target.dataset.screen;
                this.navigateToScreen(screen);
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleDetailedError(event.reason);
        });

        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleDetailedError(event.error);
        });
    }

    showToast(message, type = 'info', duration = 8000) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '⊗';
        closeBtn.onclick = () => this.dismissToast(toast);
        
        // Create message span
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        toast.appendChild(closeBtn);
        toast.appendChild(messageSpan);
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        
        toastContainer.appendChild(toast);
        
        // Force reflow
        toast.offsetHeight;
        
        // Animate in
        toast.style.transition = 'all 0.3s ease-out';
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
        
        setTimeout(() => {
            this.dismissToast(toast);
        }, duration);
    }
    
    dismissToast(toast) {
        toast.style.transition = 'all 0.3s ease-in';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }

    handleDetailedError(error) {
        let userMessage = 'An unexpected error occurred';
        let details = '';
        let isUserError = false;

        if (error && typeof error === 'object') {
            const errorMessage = error.message || error.toString();
            
            // Gmail consent/authentication errors (user-side)
            if (errorMessage.includes('consent') || errorMessage.includes('authorization') || errorMessage.includes('gmail')) {
                userMessage = 'Gmail Authentication Failed';
                details = 'Please reconnect Gmail in Settings. Make sure to grant all required permissions.';
                isUserError = true;
            }
            // Security question/answer mismatch (user-side)
            else if (errorMessage.includes('security') || errorMessage.includes('question') || errorMessage.includes('answer') || errorMessage.includes('ANSWER_MISMATCH')) {
                userMessage = 'Security Questions Issue';
                details = 'Your security questions/answers may be incorrect. Please update them in Settings.';
                isUserError = true;
            }
            // ERP login related errors (user-side)
            else if (errorMessage.includes('erp') || errorMessage.includes('login') || errorMessage.includes('credentials') || errorMessage.includes('Invalid OTP')) {
                userMessage = 'ERP Login Failed';
                details = 'Check your roll number and password in Settings. Ensure your account is active.';
                isUserError = true;
            }
            // OTP/email related errors (user-side)
            else if (errorMessage.includes('otp') || errorMessage.includes('email') || errorMessage.includes('verification')) {
                userMessage = 'OTP Verification Failed';
                details = 'Unable to retrieve OTP from Gmail. Check your Gmail connection and try again.';
                isUserError = true;
            }
            // Network/connection errors (could be user or system)
            else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
                userMessage = 'Connection Error';
                details = 'Please check your internet connection and try again.';
                isUserError = true;
            }
            // Generic error with more context (extension code error)
            else if (errorMessage.length > 0) {
                userMessage = 'Error Details';
                details = errorMessage.substring(0, 200); // Limit length
                console.error('Extension code error:', error);
            }
        }

        // Only log as error if it's not a user-side issue
        if (!isUserError) {
            console.error('Extension error:', error);
        }

        // Show detailed error in toast
        this.showDetailedError(userMessage, details);
    }

    showDetailedError(title, details) {
        const message = details ? `${title}: ${details}` : title;
        this.showToast(message, 'error', 12000); // Longer duration for error messages
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    getController(name) {
        return this.controllers[name];
    }
}

window.erpApp = new ERPApp();
