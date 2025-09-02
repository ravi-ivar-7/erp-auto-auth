import { ERPApiService } from '../services/ERPApiService.js';
import { CredentialService } from '../services/CredentialService.js';
import { StorageService } from '../services/StorageService.js';

export class LoginController {
    constructor(app) {
        this.app = app;
        this.loginInProgress = false;
        this.progressSteps = ['init', 'credentials', 'security', 'otp', 'complete'];
        this.currentStepIndex = 0;
    }

    async init() {
        // Controller initialization
    }

    async onScreenLoad() {
        this.setupEventListeners();
        this.resetProgress();
    }

    setupEventListeners() {
        const cancelButton = document.getElementById('cancel-login');
        cancelButton?.addEventListener('click', () => this.cancelLogin());
    }

    async startLogin() {
        if (this.loginInProgress) return;
        
        this.loginInProgress = true;
        
        try {
            this.showProgressOnDashboard();
            
            const result = await ERPApiService.performFullLogin(null, (step, message) => {
                this.updateDashboardProgress(step, message);
            });
            
            
            if (result.success) {
                await StorageService.set('last_login', new Date().toISOString());
                await this.completeLogin();
            } else {
                throw new Error(result.error || 'Login failed');
            }
        } catch (error) {
            if (error.message.includes('Invalid OTP') || error.message.includes('security question') || error.message.includes('ANSWER_MISMATCH')) {
            } else {
                console.error('Login failed:', error);
            }
            this.handleLoginError(error);
        } finally {
            this.loginInProgress = false;
        }
    }

    showProgressOnDashboard() {
        const loginProgress = document.querySelector('.login-progress');
        if (loginProgress) {
            loginProgress.classList.remove('hidden');
        }
        
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
        }
    }
    
    updateDashboardProgress(step, message) {
        const stepMapping = {
            'init': 'credentials',
            'credentials': 'credentials', 
            'security': 'security',
            'otp': 'otp',
            'complete': 'login'
        };
        
        const mappedStep = stepMapping[step] || step;
        const stepElement = document.querySelector(`[data-step="${mappedStep}"]`);
        
        document.querySelectorAll('.progress-step').forEach(el => {
            el.classList.remove('active', 'completed');
        });
        
        const allSteps = ['credentials', 'security', 'otp', 'login'];
        const currentIndex = allSteps.indexOf(mappedStep);
        
        allSteps.forEach((stepName, index) => {
            const el = document.querySelector(`[data-step="${stepName}"]`);
            if (el) {
                if (index < currentIndex) {
                    el.classList.add('completed');
                } else if (index === currentIndex) {
                    el.classList.add('active');
                }
            }
        });
        
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            const progress = ((currentIndex + 1) / allSteps.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }
    
    updateProgress(step, message) {
        const stepIndex = this.progressSteps.indexOf(step);
        if (stepIndex !== -1) {
            this.currentStepIndex = stepIndex;
        }
        
        this.updateProgressUI(step, message);
        this.updateProgressBar();
    }

    updateProgressUI(step, message) {
        const steps = document.querySelectorAll('.login-step');
        steps.forEach((stepEl, index) => {
            stepEl.classList.remove('active', 'completed');
            
            if (index < this.currentStepIndex) {
                stepEl.classList.add('completed');
            } else if (index === this.currentStepIndex) {
                stepEl.classList.add('active');
            }
        });
        
        const activeStep = document.querySelector('.login-step.active');
        if (activeStep && message) {
            const messageEl = activeStep.querySelector('.step-content p');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    updateProgressBar() {
        const progressBar = document.querySelector('.progress-bar');
        const percentage = document.querySelector('.progress-percentage');
        
        if (progressBar && percentage) {
            const progress = (this.currentStepIndex / (this.progressSteps.length - 1)) * 100;
            
            const circumference = 2 * Math.PI * 54;
            const offset = circumference - (progress / 100) * circumference;
            
            progressBar.style.strokeDashoffset = offset;
            percentage.textContent = `${Math.round(progress)}%`;
        }
    }

    resetProgress() {
        this.currentStepIndex = 0;
        this.updateProgressUI('init', 'Preparing login sequence');
        this.updateProgressBar();
    }

    async completeLogin() {
        this.updateDashboardProgress('complete', 'Login successful');
        
        setTimeout(() => {
            const loginProgress = document.querySelector('.login-progress');
            if (loginProgress) {
                loginProgress.classList.add('hidden');
            }
            
            this.showSuccessScreen();
            
        }, 2000);
    }
    

    showSuccessScreen() {
        const successScreen = document.querySelector('.success-screen');
        if (successScreen) {
            successScreen.classList.remove('hidden');
            successScreen.classList.add('animate-fade-in');
            
            const openErpBtn = document.getElementById('open-erp');
            openErpBtn?.addEventListener('click', async () => {
                try {
                    await ERPApiService.openAuthenticatedERP();
                    window.close();
                } catch (error) {
                    console.error('Failed to open ERP:', error);
                    this.app.showError('Failed to open ERP');
                }
            });
        }
    }

    handleLoginError(error) {
        const loginProgress = document.querySelector('.login-progress');
        if (loginProgress) {
            loginProgress.classList.add('hidden');
        }
        
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span class="btn-icon">🚀</span><span class="btn-text">Login to ERP</span>';
        }
        
        this.app.showError(error.message || 'Login failed');
    }

    cancelLogin() {
        this.loginInProgress = false;
        this.app.navigateToScreen('dashboard');
    }
}
