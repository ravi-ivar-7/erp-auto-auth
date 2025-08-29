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
            this.showError('An unexpected error occurred');
        });

        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('An unexpected error occurred');
        });
    }

    showToast(message, type = 'info', duration = 8000) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
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
            toast.style.transition = 'all 0.3s ease-in';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
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
