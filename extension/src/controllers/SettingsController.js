import { CredentialService } from '../services/CredentialService.js';
import { StorageService } from '../services/StorageService.js';
import { GmailService } from '../services/GmailService.js';

export class SettingsController {
    constructor(app) {
        this.app = app;
        this.editMode = {};
    }

    async init() {
        // Controller initialization
    }

    async onScreenLoad() {
        await this.loadSettings();
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const userData = await CredentialService.getUserData();
            
            this.userData = userData;
            document.getElementById('settings-roll').textContent = userData?.rollNumber || 'Not set';
            document.getElementById('settings-password').textContent = '••••••••';
            
            // Update Gmail UI based on connection status
            await this.loadGmailInfo();
            
            this.loadSecurityQuestions(userData?.securityQuestions || []);
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.app.showError('Failed to load settings');
        }
    }

    async loadGmailInfo() {
        try {
            const gmailData = await CredentialService.getGmailData();
            const disconnectBtn = document.getElementById('disconnect-gmail');
            const reconnectBtn = document.getElementById('reconnect-gmail');
            const gmailEmail = document.getElementById('gmail-email');
            const gmailStatus = document.getElementById('gmail-status');
            
            if (gmailData && gmailData.token) {
                // Gmail is connected - show disconnect button only
                gmailEmail.textContent = gmailData.email || 'Connected';
                gmailStatus.textContent = 'Connected';
                disconnectBtn.style.display = 'inline-block';
                reconnectBtn.style.display = 'none';
            } else {
                // Gmail is not connected - hide both buttons
                gmailEmail.textContent = 'Not connected';
                gmailStatus.textContent = 'Disconnected';
                disconnectBtn.style.display = 'none';
                reconnectBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load Gmail info:', error);
        }
    }

    loadSecurityQuestions(questions) {
        const container = document.getElementById('security-questions-list');
        container.innerHTML = '';
        
        questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'security-question-item';
            questionDiv.innerHTML = `
                <div class="question-text">
                    <strong>Q:</strong> ${q.question}
                </div>
                <div class="answer-row">
                    <div class="answer-text">
                        <strong>A:</strong> <span id="answer-${index}">${'•'.repeat(Math.min(q.answer.length, 20))}</span>
                    </div>
                    <button class="btn-mini" id="show-answer-${index}">👁️</button>
                </div>
            `;
            container.appendChild(questionDiv);
            
            // Add event listener after creating the element
            const button = document.getElementById(`show-answer-${index}`);
            if (button) {
                button.addEventListener('click', () => this.toggleShowAnswer(index));
            }
        });
    }

    setupEventListeners() {
        // Password toggle
        const passwordBtn = document.getElementById('show-password');
        if (passwordBtn) {
            passwordBtn.addEventListener('click', () => {
                this.togglePassword();
            });
        }
        
        document.getElementById('disconnect-gmail')?.addEventListener('click', () => this.handleGmailDisconnect());
        document.getElementById('reconnect-gmail')?.addEventListener('click', () => this.handleGmailReconnect());
        document.getElementById('finish-setup')?.addEventListener('click', () => this.handleFinishSetup());
        document.getElementById('back-btn')?.addEventListener('click', () => this.previousStep());
        document.getElementById('next-btn')?.addEventListener('click', () => this.handleNextStep());
        document.getElementById('reset-data')?.addEventListener('click', () => this.resetData());
        
        // Make controller globally accessible for answer buttons
        window.settingsController = this;
    }

    togglePassword() {
        const passwordElement = document.getElementById('settings-password');
        const passwordButton = document.getElementById('show-password');
        
        if (!passwordElement || !passwordButton || !this.userData) {
            return;
        }
        
        const isHidden = passwordElement.textContent === '••••••••';
        
        if (isHidden) {
            passwordElement.textContent = this.userData.password || 'Not set';
            passwordButton.textContent = '🙈';
        } else {
            passwordElement.textContent = '••••••••';
            passwordButton.textContent = '👁️';
        }
    }
    
    toggleShowAnswer(index) {
        if (!this.userData?.securityQuestions) return;
        
        const element = document.getElementById(`answer-${index}`);
        const button = document.getElementById(`show-answer-${index}`);
        const question = this.userData.securityQuestions[index];
        
        if (!element || !button || !question) return;
        
        const isShowing = !element.textContent.includes('•');
        
        if (isShowing) {
            element.textContent = '•'.repeat(Math.min(question.answer.length, 20));
            button.textContent = '👁️';
        } else {
            element.textContent = question.answer;
            button.textContent = '🙈';
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (!element.textContent.includes('•')) {
                    element.textContent = '•'.repeat(Math.min(question.answer.length, 20));
                    button.textContent = '👁️';
                }
            }, 7000);
        }
    }

    async reconnectGmail() {
        try {
            const button = document.getElementById('reconnect-gmail');
            button.disabled = true;
            button.textContent = 'Connecting...';
            
            await GmailService.disconnect();
            const tokenData = await GmailService.authenticate();
            
            document.getElementById('gmail-email').textContent = tokenData.email;
            button.textContent = 'Reconnect';
            button.disabled = false;
            
            this.app.showSuccess('Gmail reconnected successfully');
        } catch (error) {
            console.error('Gmail reconnection failed:', error);
            this.app.showError('Failed to reconnect Gmail');
            
            const button = document.getElementById('reconnect-gmail');
            button.disabled = false;
            button.textContent = 'Reconnect';
        }
    }

    async updateSecurityQuestions() {
        this.app.showError('Security question updates not yet implemented');
    }

    async resetData() {
        const confirmed = confirm('Are you sure you want to reset all data? This cannot be undone.');
        if (!confirmed) return;
        
        try {
            const success = await this.app.getController('app').resetAllData();
            if (success) {
                this.app.showSuccess('All data has been reset');
                setTimeout(() => {
                    this.app.navigateToScreen('setup');
                }, 2000);
            } else {
                this.app.showError('Failed to reset data');
            }
        } catch (error) {
            console.error('Reset failed:', error);
            this.app.showError('Failed to reset data');
        }
    }

    
    async handleGmailDisconnect() {
        try {
            // Clear Gmail data from Chrome storage
            await StorageService.remove('gmail_data');
            
            // Clear Chrome identity tokens
            try {
                await chrome.identity.clearAllCachedAuthTokens();
            } catch (error) {
                console.log('Failed to clear cached tokens:', error);
            }
            
            // Update UI
            await this.loadGmailInfo();
            this.app.showSuccess('Gmail disconnected successfully');
        } catch (error) {
            console.error('Failed to disconnect Gmail:', error);
            this.app.showError('Failed to disconnect Gmail');
        }
    }
    
    async handleGmailReconnect() {
        try {
            this.showFeedback('Connecting to Gmail...');
            
            const { GmailService } = await import('../services/GmailService.js');
            const tokenData = await GmailService.authenticate();
            
            // Save Gmail data
            await CredentialService.saveGmailData(tokenData);
            
            // Update UI
            await this.loadGmailInfo();
            this.showFeedback('✓ Gmail connected');
        } catch (error) {
            console.error('Failed to reconnect Gmail:', error);
            this.showFeedback('✗ Connection failed', true);
        }
    }
}
