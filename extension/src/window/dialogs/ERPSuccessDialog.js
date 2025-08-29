class ERPSuccessDialog {
    constructor(app) {
        this.app = app;
        this.dialog = null;
        this.overlay = null;
        this.result = null;
    }

    async show(result) {
        if (this.dialog) {
            return;
        }

        this.result = result;

        try {
            // Create overlay
            this.overlay = document.createElement('div');
            this.overlay.className = 'erp-success-overlay';
            
            // Create dialog container
            this.dialog = document.createElement('div');
            this.dialog.className = 'erp-success-dialog';
            
            // Load dialog content
            const response = await fetch(chrome.runtime.getURL('src/window/dialogs/erp-success.html'));
            const html = await response.text();
            this.dialog.innerHTML = html;

            // Load CSS
            const cssResponse = await fetch(chrome.runtime.getURL('src/window/styles/erp-success-dialog.css'));
            const cssContent = await cssResponse.text();

            // Create style
            const style = document.createElement('style');
            style.textContent = cssContent;
            document.head.appendChild(style);
            
            // Append to body
            this.overlay.appendChild(this.dialog);
            document.body.appendChild(this.overlay);

            // Disable body scroll
            document.body.style.overflow = 'hidden';
            
            // Populate data
            this.populateData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show with animation
            requestAnimationFrame(() => {
                this.overlay.classList.add('show');
            });
            
        } catch (error) {
            console.error('Failed to show ERP success dialog:', error);
            this.app?.showError?.('Failed to load success dialog');
        }
    }

    populateData() {
        if (!this.result) return;

        // Update session token preview
        const sessionTokenEl = this.dialog.querySelector('#session-token-preview');
        if (sessionTokenEl) {
            const token = this.result.sessionToken;
            sessionTokenEl.textContent = token ? token.substring(0, 20) + '...' : 'Not available';
        }

        // Update SSO token preview
        const ssoTokenEl = this.dialog.querySelector('#sso-token-preview');
        if (ssoTokenEl) {
            const ssoToken = this.result.ssoToken || this.result.token;
            ssoTokenEl.textContent = ssoToken ? (ssoToken.length > 30 ? ssoToken.substring(0, 30) + '...' : ssoToken) : 'Not available';
        }
    }

    setupEventListeners() {
        // Later button
        const laterBtn = this.dialog.querySelector('#erp-success-later-btn');
        laterBtn?.addEventListener('click', () => this.close());
        
        // Open ERP button
        const openBtn = this.dialog.querySelector('#erp-success-open-btn');
        openBtn?.addEventListener('click', () => this.openERPPortal());
        
        // Close on overlay click
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Close on escape key
        this.handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleEscape);
    }

    async openERPPortal() {
        try {
            if (this.app && typeof this.app.openERPPortal === 'function') {
                await this.app.openERPPortal(this.result);
            } else {
                // Fallback: open ERP portal directly
                const erpUrl = 'https://erp.iitkgp.ac.in/IIT_ERP3/';
                chrome.tabs.create({ url: erpUrl });
            }
            this.close();
        } catch (error) {
            console.error('Failed to open ERP portal:', error);
            this.app?.showError?.('Failed to open ERP portal');
        }
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

        // Remove escape listener
        if (this.handleEscape) {
            document.removeEventListener('keydown', this.handleEscape);
            this.handleEscape = null;
        }
    }
}

export { ERPSuccessDialog };
