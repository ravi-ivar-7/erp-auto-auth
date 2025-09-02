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
            this.dialog.style.zIndex = '99999';
            this.dialog.style.position = 'fixed';
            this.dialog.style.top = '0';
            this.dialog.style.left = '0';
            this.dialog.style.width = '100%';
            this.dialog.style.height = '100%';

            this.style = document.createElement('style');
            this.style.textContent = cssContent;

            document.head.appendChild(this.style);
            document.body.appendChild(this.dialog);

            document.body.style.overflow = 'hidden';

            await this.loadData();
            
            this.setupEventListeners();
            
            requestAnimationFrame(() => {
                const overlay = this.dialog.querySelector('.credentials-overlay');
                if (overlay) {
                    overlay.classList.add('show');
                } else {
                    this.dialog.classList.add('show');
                }
            });

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
            const erpSession = await this.getERPSession();
            
            if (!erpSession) {
                this.showNoSessionMessage();
                return;
            }

            this.sessionTokenValue = erpSession.sessionToken || 'Not available';
            this.ssoTokenValue = erpSession.ssoToken || 'Not available';

            const sessionTokenEl = document.getElementById('session-token-display');
            if (sessionTokenEl) {
                sessionTokenEl.textContent = this.sessionTokenValue;
            }

            const ssoTokenEl = document.getElementById('sso-token-display');
            if (ssoTokenEl) {
                ssoTokenEl.textContent = this.ssoTokenValue;
            }

            const authUrlEl = document.getElementById('auth-url-value');
            if (authUrlEl && erpSession.sessionToken) {
                authUrlEl.textContent = `https://erp.iitkgp.ac.in/IIT_ERP3/?sessionToken=${erpSession.sessionToken}`;
            }

            const loginTimeEl = document.getElementById('login-time-value');
            if (loginTimeEl && erpSession.timestamp) {
                const loginDate = new Date(erpSession.timestamp);
                loginTimeEl.textContent = loginDate.toLocaleString();
            }

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
        document.getElementById('credentials-close')?.addEventListener('click', () => this.close());

        this.setupCopyButtons();

        const overlay = document.querySelector('.credentials-overlay');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        this.handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleEscape);
    }

    setupCopyButtons() {
        const sessionTokenBtn = document.getElementById('copy-session-token');
        if (sessionTokenBtn) {
            sessionTokenBtn.addEventListener('click', () => {
                this.copyToClipboard(this.sessionTokenValue, sessionTokenBtn);
            });
        }

        const ssoTokenBtn = document.getElementById('copy-sso-token');
        if (ssoTokenBtn) {
            ssoTokenBtn.addEventListener('click', () => {
                this.copyToClipboard(this.ssoTokenValue, ssoTokenBtn);
            });
        }

        const erpUrlBtn = document.getElementById('copy-erp-url');
        if (erpUrlBtn) {
            erpUrlBtn.addEventListener('click', () => {
                this.copyToClipboard('https://erp.iitkgp.ac.in/IIT_ERP3/', erpUrlBtn);
            });
        }
        
        const authUrlBtn = document.getElementById('copy-auth-url');
        if (authUrlBtn) {
            authUrlBtn.addEventListener('click', () => {
                const authUrl = document.getElementById('auth-url-value')?.textContent;
                this.copyToClipboard(authUrl, authUrlBtn);
            });
        }

        const loginTimeBtn = document.getElementById('copy-login-time');
        if (loginTimeBtn) {
            loginTimeBtn.addEventListener('click', () => {
                const loginTime = document.getElementById('login-time-value')?.textContent;
                this.copyToClipboard(loginTime, loginTimeBtn);
            });
        }

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
        if (this.dialog) {
            // Re-enable body scroll
            document.body.style.overflow = '';
            
            this.dialog.classList.remove('show');
            setTimeout(() => {
                this.dialog?.remove();
                this.dialog = null;
            }, 300);
        }
        if (this.style) {
            this.style.remove();
            this.style = null;
        }
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
        if (this.handleEscape) {
            document.removeEventListener('keydown', this.handleEscape);
        }
    }
}
