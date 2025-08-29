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
        // Check privacy policy first
        await this.checkPrivacyPolicy();
        
        await this.loadDashboardData();
        await this.checkERPSession();
        this.setupEventListeners();
    }

    async checkPrivacyPolicy() {
        try {
            const { PrivacyPolicyDialog } = await import('../window/dialogs/PrivacyPolicyDialog.js');
            
            const isRequired = await PrivacyPolicyDialog.isPrivacyPolicyRequired();
            if (isRequired) {
                const dialog = new PrivacyPolicyDialog(this.app);
                await dialog.show();
            }
        } catch (error) {
            console.error('Failed to check privacy policy:', error);
        }
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
        
        const viewCredentialsBtn = document.getElementById('view-credentials-btn');
        viewCredentialsBtn?.addEventListener('click', () => this.showERPCredentialsDialog());
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
            this.app.handleDetailedError(error);
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
                const timeRemaining = await CredentialService.getSessionTimeRemaining();
                const formattedTime = CredentialService.formatTimeRemaining(timeRemaining);
                
                sessionTime.textContent = `Session from: ${sessionDate.toLocaleString()} (Expires in: ${formattedTime})`;
                quickAccessCard.classList.remove('hidden');
                
                // Auto-refresh to update countdown
                if (timeRemaining > 0) {
                    setTimeout(() => this.checkERPSession(), 30000); // Update every 30 seconds
                }
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
                            <div class="info-item">
                                <span class="info-label">Portal:</span>
                                <span class="info-value">IIT Kharagpur ERP System</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">URL:</span>
                                <span class="info-value">https://erp.iitkgp.ac.in/IIT_ERP3/</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Session Token:</span>
                                <span class="info-value">${result.sessionToken ? result.sessionToken.substring(0, 20) + '...' : 'None'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">SSO Token:</span>
                                <span class="info-value">${result.ssoToken || result.token || 'Not available'}</span>
                            </div>
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
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
            }
            .modal-dialog {
                background: var(--bg-secondary, #1a1a1a);
                border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                border-radius: var(--radius-large, 16px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                max-width: 480px;
                width: 100%;
                animation: modalSlideIn 0.3s ease-out;
                overflow: hidden;
            }
            .modal-header {
                padding: 24px 24px 16px;
                border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                background: linear-gradient(135deg, var(--bg-tertiary, #2a2a2a) 0%, var(--bg-secondary, #1a1a1a) 100%);
            }
            .modal-header h3 {
                margin: 0;
                color: var(--text-primary, #ffffff);
                font-size: 18px;
                font-weight: 600;
            }
            .modal-body {
                padding: 24px;
                color: var(--text-secondary, #e0e0e0);
            }
            .modal-body p {
                margin: 0 0 16px 0;
                font-size: 14px;
                line-height: 1.5;
            }
            .erp-info {
                background: var(--glass, rgba(255, 255, 255, 0.05));
                border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
                border-radius: var(--radius, 8px);
                padding: 16px;
                margin-top: 16px;
            }
            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
                gap: 16px;
            }
            .info-item:last-child {
                margin-bottom: 0;
            }
            .info-label {
                color: var(--text-muted, #a0a0a0);
                font-size: 13px;
                font-weight: 500;
                min-width: 80px;
                flex-shrink: 0;
            }
            .info-value {
                color: var(--text-primary, #ffffff);
                font-size: 13px;
                word-break: break-all;
                text-align: right;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            }
            .modal-footer {
                padding: 16px 24px 24px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                background: var(--glass, rgba(255, 255, 255, 0.02));
            }
            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: var(--radius, 8px);
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all var(--transition, 0.3s ease);
                min-width: 80px;
            }
            .btn-secondary {
                background: var(--bg-tertiary, #2a2a2a);
                color: var(--text-secondary, #e0e0e0);
                border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
            }
            .btn-secondary:hover {
                background: var(--bg-primary, #0a0a0a);
                transform: translateY(-1px);
            }
            .btn-primary {
                background: linear-gradient(135deg, var(--accent-primary, #00d4ff) 0%, var(--accent-secondary, #0099cc) 100%);
                color: var(--bg-primary, #0a0a0a);
                font-weight: 600;
            }
            .btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
            }
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-30px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            @media (max-width: 480px) {
                .modal-dialog {
                    margin: 0;
                    max-width: none;
                    border-radius: var(--radius, 8px);
                }
                .info-item {
                    flex-direction: column;
                    gap: 4px;
                }
                .info-value {
                    text-align: left;
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

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                document.head.removeChild(style);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    async showERPCredentialsDialog() {
        try {
            const { ERPCredentialsDialog } = await import('../window/dialogs/ERPCredentialsDialog.js');
            const dialog = new ERPCredentialsDialog(this.app);
            await dialog.show();
        } catch (error) {
            console.error('Failed to show ERP credentials dialog:', error);
            this.app.showError('Failed to load ERP credentials');
        }
    }

    async openERPPortal(result) {
        try {
            let url = 'https://erp.iitkgp.ac.in/IIT_ERP3/';
            
            // Use ssoToken if available
            if (result?.ssoToken) {
                url += `?ssoToken=${result.ssoToken}`;
            }
            
            // Try to send message to background script to open new tab
            try {
                await chrome.runtime.sendMessage({
                    action: 'openTab',
                    url: url
                });
                this.app.showSuccess('ERP Portal opened in new tab');
                return; // Exit successfully, don't execute fallbacks
            } catch (msgError) {
                // Fallback if background script communication fails
                window.open(url, '_blank');
                this.app.showSuccess('ERP Portal opened in new tab');
                return; // Exit after fallback, don't continue to catch block
            }
        } catch (error) {
            console.error('Failed to open ERP portal:', error);
            // Final fallback: try the direct homepage
            window.open('https://erp.iitkgp.ac.in/IIT_ERP3/', '_blank');
            this.app.showError('Opened ERP portal with basic URL due to error');
        }
    }
}
