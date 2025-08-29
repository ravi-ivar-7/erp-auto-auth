export class ERPCredentialsDialog {
    constructor(app) {
        this.app = app;
        this.dialog = null;
        this.style = null;
        this.sessionTokenValue = null;
        this.ssoTokenValue = null;
        this.timeInterval = null;
    }

    async show() {
        try {

            // Load HTML template
            const htmlResponse = await fetch(chrome.runtime.getURL('src/window/dialogs/credentials-dialog.html'));
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch(chrome.runtime.getURL('src/window/styles/credentials-dialog.css'));
            const cssContent = await cssResponse.text();

            // Create dialog
            this.dialog = document.createElement('div');
            this.dialog.innerHTML = htmlContent;

            // Create style
            this.style = document.createElement('style');
            this.style.textContent = cssContent;

            // Add to DOM
            document.head.appendChild(this.style);
            document.body.appendChild(this.dialog);

            // Load ERP session data
            await this.loadData();
            
            // Setup event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Failed to show credentials dialog:', error);
            this.app.showError('Failed to load credentials');
        }
    }

    async getERPSession() {
        // Import StorageService to properly decrypt data
        const { StorageService } = await import('../../services/StorageService.js');
        return await StorageService.get('erp_session');
    }

    async loadData() {
        try {
            // Get ERP session data using correct storage key
            const erpSession = await this.getERPSession();
            
            if (!erpSession) {
                this.showNoSessionMessage();
                return;
            }

            // Store and display token values directly
            this.sessionTokenValue = erpSession.sessionToken || 'Not available';
            this.ssoTokenValue = erpSession.ssoToken || 'Not available';

            // Display session token
            const sessionTokenEl = document.getElementById('session-token-display');
            if (sessionTokenEl) {
                sessionTokenEl.textContent = this.sessionTokenValue;
            }

            // Display SSO token
            const ssoTokenEl = document.getElementById('sso-token-display');
            if (ssoTokenEl) {
                ssoTokenEl.textContent = this.ssoTokenValue;
            }

            // Populate authenticated URL
            const authUrlEl = document.getElementById('auth-url-value');
            if (authUrlEl && erpSession.sessionToken) {
                authUrlEl.textContent = `https://erp.iitkgp.ac.in/IIT_ERP3/?sessionToken=${erpSession.sessionToken}`;
            }

            // Populate login time
            const loginTimeEl = document.getElementById('login-time-value');
            if (loginTimeEl && erpSession.timestamp) {
                const loginDate = new Date(erpSession.timestamp);
                loginTimeEl.textContent = loginDate.toLocaleString();
            }

            // Populate user agent
            const userAgentEl = document.getElementById('user-agent-value');
            if (userAgentEl) {
                userAgentEl.textContent = navigator.userAgent;
            }
            
        } catch (error) {
            console.error('Failed to load ERP session data:', error);
            this.app.showError('Failed to load session credentials');
        }
    }

    updateTimeRemaining(expiresAt) {
        const timeRemainingEl = document.getElementById('time-remaining-value');
        if (!timeRemainingEl) return;

        const now = Date.now();
        const expiry = new Date(expiresAt).getTime();
        const remaining = expiry - now;

        if (remaining <= 0) {
            timeRemainingEl.textContent = 'Expired';
            timeRemainingEl.style.color = '#f87171';
            if (this.timeInterval) {
                clearInterval(this.timeInterval);
            }
        } else {
            const minutes = Math.floor(remaining / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            timeRemainingEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            timeRemainingEl.style.color = remaining < 60000 ? '#f87171' : '#4ade80'; // Red if less than 1 minute
        }
    }

    showNoSessionMessage() {
        const contentEl = document.querySelector('.credentials-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="credentials-section">
                    <div style="text-align: center; padding: 2rem; color: #f87171;">
                        <h3>❌ No Active ERP Session</h3>
                        <p>Please log in to ERP first to view session credentials.</p>
                    </div>
                </div>
            `;
        }
    }


    setupEventListeners() {
        // Close button
        document.getElementById('credentials-close')?.addEventListener('click', () => this.close());

        // Copy buttons
        this.setupCopyButtons();

        // Close on overlay click
        const overlay = document.querySelector('.credentials-overlay');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        // Keyboard close
        this.handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleEscape);
    }

    setupCopyButtons() {
        // Session token copy
        const sessionTokenBtn = document.getElementById('copy-session-token');
        if (sessionTokenBtn) {
            sessionTokenBtn.addEventListener('click', () => {
                this.copyToClipboard(this.sessionTokenValue, sessionTokenBtn);
            });
        }

        // SSO token copy
        const ssoTokenBtn = document.getElementById('copy-sso-token');
        if (ssoTokenBtn) {
            ssoTokenBtn.addEventListener('click', () => {
                this.copyToClipboard(this.ssoTokenValue, ssoTokenBtn);
            });
        }


        // ERP URL copy
        const erpUrlBtn = document.getElementById('copy-erp-url');
        if (erpUrlBtn) {
            erpUrlBtn.addEventListener('click', () => {
                this.copyToClipboard('https://erp.iitkgp.ac.in/IIT_ERP3/', erpUrlBtn);
            });
        }

        // Authenticated URL copy
        const authUrlBtn = document.getElementById('copy-auth-url');
        if (authUrlBtn) {
            authUrlBtn.addEventListener('click', () => {
                const authUrl = document.getElementById('auth-url-value')?.textContent;
                this.copyToClipboard(authUrl, authUrlBtn);
            });
        }

        // Login time copy
        const loginTimeBtn = document.getElementById('copy-login-time');
        if (loginTimeBtn) {
            loginTimeBtn.addEventListener('click', () => {
                const loginTime = document.getElementById('login-time-value')?.textContent;
                this.copyToClipboard(loginTime, loginTimeBtn);
            });
        }

        // User agent copy
        const userAgentBtn = document.getElementById('copy-user-agent');
        if (userAgentBtn) {
            userAgentBtn.addEventListener('click', () => {
                const userAgent = document.getElementById('user-agent-value')?.textContent;
                this.copyToClipboard(userAgent, userAgentBtn);
            });
        }
    }

    async copyToClipboard(text, button) {
        if (!text) return;
        
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = '✅';
            setTimeout(() => {
                button.textContent = '📋';
            }, 1000);
        } catch (error) {
            console.error('Failed to copy:', error);
            button.textContent = '❌';
            setTimeout(() => {
                button.textContent = '📋';
            }, 1000);
        }
    }

    close() {
        // Clear time interval
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
        }

        // Remove event listener
        if (this.handleEscape) {
            document.removeEventListener('keydown', this.handleEscape);
        }

        // Remove dialog and style from DOM
        if (this.dialog) {
            this.dialog.remove();
        }
        if (this.style) {
            this.style.remove();
        }
    }
}
