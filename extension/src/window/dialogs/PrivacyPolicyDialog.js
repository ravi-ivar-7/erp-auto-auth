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
            // Create overlay
            this.overlay = document.createElement('div');
            this.overlay.className = 'privacy-dialog-overlay';
            
            // Create dialog container
            this.dialog = document.createElement('div');
            this.dialog.className = 'privacy-dialog';
            
            // Load dialog content
            const response = await fetch(chrome.runtime.getURL('src/window/dialogs/privacy-policy.html'));
            const html = await response.text();
            this.dialog.innerHTML = html;
            
            // Append to body
            this.overlay.appendChild(this.dialog);
            document.body.appendChild(this.overlay);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Disable body scroll
            document.body.style.overflow = 'hidden';
            
            // Show with animation
            requestAnimationFrame(() => {
                this.overlay.classList.add('show');
            });
            
        } catch (error) {
            console.error('Failed to show privacy policy dialog:', error);
            this.app?.showError?.('Failed to load privacy policy');
        }
    }

    setupEventListeners() {
        // Accept button
        const acceptBtn = this.dialog.querySelector('#privacy-accept-btn');
        acceptBtn?.addEventListener('click', () => this.acceptPrivacyPolicy());
        
        // Decline button
        const declineBtn = this.dialog.querySelector('#privacy-decline-btn');
        declineBtn?.addEventListener('click', () => this.declinePrivacyPolicy());
        
        // View full policy link
        const viewPolicyLink = this.dialog.querySelector('#view-full-policy');
        viewPolicyLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openFullPrivacyPolicy();
        });
        
        // Prevent dialog close on overlay click for privacy policy
        this.overlay?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async acceptPrivacyPolicy() {
        try {
            // Store acceptance in local storage
            await this.setPrivacyAcceptance(true);
            
            // Close dialog
            this.close();
            
            // Show success message
            this.app?.showSuccess?.('Privacy policy accepted');
            
        } catch (error) {
            console.error('Failed to accept privacy policy:', error);
            this.app?.showError?.('Failed to save privacy acceptance');
        }
    }

    async declinePrivacyPolicy() {
        try {
            // Store decline in local storage
            await this.setPrivacyAcceptance(false);
            
            // Close dialog
            this.close();
            
            // Close extension window
            window.close();
            
        } catch (error) {
            console.error('Failed to handle privacy decline:', error);
        }
    }

    openFullPrivacyPolicy() {
        // Open the full privacy policy on GitHub
        chrome.tabs.create({
            url: 'https://github.com/ravi-ivar-7/erp-auto-auth/blob/master/docs/privacy.md'
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
