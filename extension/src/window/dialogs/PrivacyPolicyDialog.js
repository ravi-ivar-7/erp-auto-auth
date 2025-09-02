class PrivacyPolicyDialog {
    constructor(app) {
        this.app = app;
        this.dialog = null;
        this.overlay = null;
    }

    async show() {
        if (this.dialog) {
            return;
        }

        try {
            this.overlay = document.createElement('div');
            this.overlay.className = 'privacy-dialog-overlay';
            
            this.dialog = document.createElement('div');
            this.dialog.className = 'privacy-dialog';
            
            const response = await fetch(chrome.runtime.getURL('src/window/dialogs/privacy-policy.html'));
            const html = await response.text();
            this.dialog.innerHTML = html;
            
            this.overlay.appendChild(this.dialog);
            document.body.appendChild(this.overlay);
            
            this.setupEventListeners();
            
            document.body.style.overflow = 'hidden';
            
            requestAnimationFrame(() => {
                this.overlay.classList.add('show');
            });
            
        } catch (error) {
            console.error('Failed to show privacy policy dialog:', error);
            this.app?.showError?.('Failed to load privacy policy');
        }
    }

    setupEventListeners() {
        const acceptBtn = this.dialog.querySelector('#privacy-accept-btn');
        acceptBtn?.addEventListener('click', () => this.acceptPrivacyPolicy());
        
        const declineBtn = this.dialog.querySelector('#privacy-decline-btn');
        declineBtn?.addEventListener('click', () => this.declinePrivacyPolicy());
        
        const viewPolicyLink = this.dialog.querySelector('#view-full-policy');
        viewPolicyLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openFullPrivacyPolicy();
        });
        
        this.overlay?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async acceptPrivacyPolicy() {
        try {
            await this.setPrivacyAcceptance(true);
            
            this.close();
            this.app?.showSuccess?.('Privacy policy accepted');
            
        } catch (error) {
            console.error('Failed to accept privacy policy:', error);
            this.app?.showError?.('Failed to save privacy acceptance');
        }
    }

    async declinePrivacyPolicy() {
        try {
            await this.setPrivacyAcceptance(false);
            
            this.close();
            
            alert('Privacy policy declined. The extension will now close.');
            
            window.close();
            
        } catch (error) {
            console.error('Failed to handle privacy decline:', error);
        }
    }

    async openFullPrivacyPolicy() {
        const { GITHUB_CONFIG } = await import('../../config/constants.js');
        chrome.tabs.create({
            url: GITHUB_CONFIG.PRIVACY_POLICY_URL
        });
    }

    async setPrivacyAcceptance(accepted) {
        const data = {
            accepted: accepted,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        return new Promise((resolve) => {
            chrome.storage.local.set({ 'privacy_policy_acceptance': data }, resolve);
        });
    }

    static async getPrivacyAcceptance() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['privacy_policy_acceptance'], (result) => {
                const acceptance = result.privacy_policy_acceptance;
                resolve(acceptance?.accepted === true);
            });
        });
    }

    static async isPrivacyPolicyRequired() {
        const accepted = await PrivacyPolicyDialog.getPrivacyAcceptance();
        return !accepted;
    }

    close() {
        if (this.overlay) {
            // Re-enable body scroll
            document.body.style.overflow = '';
            
            this.overlay.classList.remove('show');
            setTimeout(() => {
                this.overlay?.remove();
                this.overlay = null;
                this.dialog = null;
            }, 300);
        }
    }
}

export { PrivacyPolicyDialog };
