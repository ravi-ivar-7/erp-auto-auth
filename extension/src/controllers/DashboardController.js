import { ERPApiService } from '../services/ERPApiService.js';
import { StorageService } from '../services/StorageService.js';

export class DashboardController {
    constructor(app) {
        this.app = app;
    }

    async init() {
        // Controller initialization
    }

    async onScreenLoad() {
        await this.loadDashboardData();
        await this.checkERPSession();
        this.setupEventListeners();
    }

    async loadDashboardData() {
        const userInfo = this.app.getController('app').getUserInfo();
        
        document.getElementById('account-info').textContent = 
            userInfo.rollNumber || 'Not configured';
        
        document.getElementById('gmail-info').textContent = 
            userInfo.gmailConnected ? `Connected: ${userInfo.gmailEmail}` : 'Not connected';
        
        document.getElementById('last-login-info').textContent = 
            this.app.getController('app').formatLastLogin(userInfo.lastLogin);
        
        this.updateStatusIndicator(userInfo.rollNumber && userInfo.gmailConnected);
    }

    updateStatusIndicator(isReady) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (isReady) {
            statusDot.style.background = 'var(--success)';
            statusText.textContent = 'Ready';
        } else {
            statusDot.style.background = 'var(--warning)';
            statusText.textContent = 'Setup Required';
        }
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        loginBtn?.addEventListener('click', () => this.startLogin());
        
        const cancelBtn = document.getElementById('cancel-login');
        cancelBtn?.addEventListener('click', () => this.cancelLogin());
        
        const useSessionBtn = document.getElementById('use-session-btn');
        useSessionBtn?.addEventListener('click', () => this.useLastSession());
        
        const clearSessionBtn = document.getElementById('clear-session-btn');
        clearSessionBtn?.addEventListener('click', () => this.clearSession());
    }

    async startLogin() {
        
        try {
            const validation = await this.app.getController('app').isValidSetup();
            
            if (!validation.isValid) {
                if (validation.missingCredentials) {
                    this.app.showError('Please complete setup first');
                    this.app.navigateToScreen('setup');
                    return;
                }
                if (validation.missingGmail) {
                    this.app.showError('Please connect Gmail in settings');
                    this.app.navigateToScreen('settings');
                    return;
                }
            }
            
            this.app.showSuccess('Starting ERP login...');
            
            // Show login card and progress
            const loginCard = document.getElementById('login-card');
            const loginProgress = document.querySelector('.login-progress');
            
            if (loginCard) {
                loginCard.classList.remove('hidden');
            }
            if (loginProgress) {
                loginProgress.classList.remove('hidden');
            }
            
            // Show cancel button
            const loginActions = document.querySelector('.login-actions');
            if (loginActions) {
                loginActions.classList.remove('hidden');
            }
            
            const result = await ERPApiService.performFullLogin(null, (step, data) => {
                if (step === 'polling') {
                    this.updatePollingStatus(data);
                } else {
                    this.updateDashboardProgress(step, typeof data === 'string' ? data : data.message || step);
                }
            });
            
            // Login successful - save session and show dialog
            if (result && result.success) {
                // Save ERP session tokens instead of storing in memory
                const { CredentialService } = await import('../services/CredentialService.js');
                await CredentialService.saveERPSession({
                    sessionToken: result.sessionToken,
                    ssoToken: result.ssoToken,
                    cookies: result.cookies
                });
                
                this.updateDashboardProgress('completed', 'Login completed successfully');
                
                // Update last login timestamp
                await this.app.getController('app').updateLastLogin();
                
                // Hide login progress and cancel button
                this.hideLoginProgress();
                
                // Refresh Quick Access card to show new session
                await this.checkERPSession();
                
                this.showERPAccessDialog(result);
            }
        } catch (error) {
            if (error.message.includes('Invalid OTP') || error.message.includes('security question') || error.message.includes('ANSWER_MISMATCH')) {
                console.warn('Login start failed due to user input:', error.message);
            } else {
                console.error('Login start failed:', error);
            }
            this.app.showError('Failed to start login: ' + error.message);
            this.hideLoginProgress();
        }
    }

    cancelLogin() {
        this.hideLoginProgress();
        this.app.showSuccess('Login cancelled');
    }

    async checkERPSession() {
        try {
            const { CredentialService } = await import('../services/CredentialService.js');
            const session = await CredentialService.getERPSession();
            
            const quickAccessCard = document.getElementById('quick-access-card');
            const sessionTime = document.getElementById('session-time');
            
            if (session && quickAccessCard) {
                const sessionDate = new Date(session.timestamp);
                sessionTime.textContent = `Session from: ${sessionDate.toLocaleString()}`;
                quickAccessCard.classList.remove('hidden');
            } else if (quickAccessCard) {
                quickAccessCard.classList.add('hidden');
            }
        } catch (error) {
            console.error('Failed to check ERP session:', error);
        }
    }

    async useLastSession() {
        try {
            const { CredentialService } = await import('../services/CredentialService.js');
            const session = await CredentialService.getERPSession();
            
            if (!session) {
                this.app.showError('No valid session found');
                await this.checkERPSession(); // Refresh UI
                return;
            }
            
            this.app.showSuccess('Opening ERP with saved session...');
            
            // Open ERP with stored session tokens
            const { ERPApiService } = await import('../services/ERPApiService.js');
            await ERPApiService.openAuthenticatedERP(session);
            
        } catch (error) {
            console.error('Failed to use last session:', error);
            this.app.showError('Failed to use saved session: ' + error.message);
        }
    }

    async clearSession() {
        try {
            const confirmed = confirm('Clear saved ERP session? You will need to login again.');
            if (!confirmed) return;
            
            const { CredentialService } = await import('../services/CredentialService.js');
            await CredentialService.clearERPSession();
            
            await this.checkERPSession(); // Refresh UI
            this.app.showSuccess('Session cleared');
        } catch (error) {
            console.error('Failed to clear session:', error);
            this.app.showError('Failed to clear session');
        }
    }

    hideLoginProgress() {
        const loginProgress = document.querySelector('.login-progress');
        if (loginProgress) {
            loginProgress.classList.add('hidden');
        }
        
        const loginActions = document.querySelector('.login-actions');
        if (loginActions) {
            loginActions.classList.add('hidden');
        }
    }

    updatePollingStatus(data) {
        const pollingStatus = document.querySelector('.polling-status');
        const pollingMessage = document.getElementById('polling-message');
        const pollingTimer = document.getElementById('polling-timer');
        const pollingAttempts = document.getElementById('polling-attempts');
        const pollingError = document.getElementById('polling-error');
        
        if (!pollingStatus) return;
        
        // Show polling status section
        pollingStatus.classList.remove('hidden');
        
        // Update message
        if (pollingMessage) {
            pollingMessage.textContent = data.message || 'Polling for OTP...';
        }
        
        // Update timer
        if (pollingTimer) {
            pollingTimer.textContent = data.timer || '0:00';
        }
        
        // Update attempts
        if (pollingAttempts) {
            pollingAttempts.textContent = `Attempt ${data.attempt || 1}/${data.maxAttempts || 10}`;
        }
        
        // Handle error state
        if (data.status === 'error' && pollingError) {
            pollingError.textContent = data.error || 'An error occurred';
            pollingError.classList.remove('hidden');
        } else if (pollingError) {
            pollingError.classList.add('hidden');
        }
        
        // Update polling icon based on status
        const pollingIcon = document.querySelector('.polling-icon');
        if (pollingIcon) {
            switch (data.status) {
                case 'searching':
                    pollingIcon.textContent = '🔍';
                    break;
                case 'extracting':
                    pollingIcon.textContent = '📧';
                    break;
                case 'success':
                    pollingIcon.textContent = '✅';
                    break;
                case 'error':
                    pollingIcon.textContent = '❌';
                    break;
                case 'waiting':
                    pollingIcon.textContent = '⏳';
                    break;
                default:
                    pollingIcon.textContent = '⏳';
            }
        }
    }

    updateDashboardProgress(step, message) {
        const progressSteps = document.querySelectorAll('.progress-step');
        const progressFill = document.querySelector('.progress-fill');
        
        // Update step indicators
        progressSteps.forEach((stepEl, index) => {
            const stepName = stepEl.dataset.step;
            stepEl.classList.remove('active', 'completed');
            
            if (stepName === step || step === 'completed') {
                if (step === 'completed') {
                    stepEl.classList.add('completed');
                } else {
                    stepEl.classList.add('active');
                }
            } else {
                // Mark previous steps as completed
                const stepOrder = ['init', 'credentials', 'security', 'otp', 'login', 'completed'];
                const currentIndex = stepOrder.indexOf(step);
                const stepIndex = stepOrder.indexOf(stepName);
                
                if (stepIndex < currentIndex) {
                    stepEl.classList.add('completed');
                }
            }
        });
        
        // Update progress bar
        if (progressFill) {
            const stepOrder = ['init', 'credentials', 'security', 'otp', 'login', 'completed'];
            const currentIndex = stepOrder.indexOf(step);
            const progress = ((currentIndex + 1) / stepOrder.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
        
        // Hide polling status when not on OTP step
        if (step !== 'otp') {
            const pollingStatus = document.querySelector('.polling-status');
            if (pollingStatus) {
                pollingStatus.classList.add('hidden');
            }
        }
    }

    showERPAccessDialog(result) {
        // Create modal dialog
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🎉 Login Successful!</h3>
                    </div>
                    <div class="modal-body">
                        <p>Your ERP login was successful. Would you like to open the ERP portal in a new tab?</p>
                        <div class="erp-info">
                            <strong>Portal:</strong> IIT Kharagpur ERP System<br>
                            <strong>URL:</strong> https://erp.iitkgp.ac.in/IIT_ERP3/<br>
                            <strong>Session Token:</strong> ${result.sessionToken ? result.sessionToken.substring(0, 20) + '...' : 'None'}<br>
                            <strong>SSO Token:</strong> ${result.ssoToken || result.token || 'Not available (browser limitation)'}<br>
                            <strong>Note:</strong> Browser sessions work differently than Python requests
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="dialog-cancel">Later</button>
                        <button class="btn btn-primary" id="dialog-open">Open ERP Portal</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-dialog {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                animation: modalSlideIn 0.3s ease-out;
            }
            .modal-header {
                padding: 20px 20px 10px;
                border-bottom: 1px solid #eee;
            }
            .modal-header h3 {
                margin: 0;
                color: #2c3e50;
            }
            .modal-body {
                padding: 20px;
                color: #333;
            }
            .erp-info {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 4px;
                margin-top: 15px;
                font-size: 14px;
                line-height: 1.5;
            }
            .modal-footer {
                padding: 10px 20px 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            .btn-secondary:hover {
                background: #5a6268;
            }
            .btn-primary {
                background: #007bff;
                color: white;
            }
            .btn-primary:hover {
                background: #0056b3;
            }
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(dialog);

        // Event listeners
        document.getElementById('dialog-cancel').addEventListener('click', () => {
            document.body.removeChild(dialog);
            document.head.removeChild(style);
        });

        document.getElementById('dialog-open').addEventListener('click', async () => {
            await this.openERPPortal(result);
            document.body.removeChild(dialog);
            document.head.removeChild(style);
        });

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
                document.head.removeChild(style);
            }
        });
    }

    async openERPPortal(result) {
        try {
            
            let url = 'https://erp.iitkgp.ac.in/IIT_ERP3/';
            
            // Use ssoToken if available
            if (result?.ssoToken) {
                url += `?ssoToken=${result.ssoToken}`;
            }
            
            // Send message to background script to open new tab
            try {
                await chrome.runtime.sendMessage({
                    action: 'openTab',
                    url: url
                });
                this.app.showSuccess('ERP Portal opened in new tab');
            } catch (msgError) {
                // Fallback if background script communication fails
                window.open(url, '_blank');
                this.app.showSuccess('ERP Portal opened in new tab');
            }
        } catch (error) {
            console.error('Failed to open ERP portal:', error);
               // Fallback: try the direct homepage
            window.open('https://erp.iitkgp.ac.in/IIT_ERP3/', '_blank');
        }
    }
}
