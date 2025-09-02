import { GMAIL_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { CredentialService } from './CredentialService.js'; 

export class GmailService {
    static async authenticate() {
        try {
            await chrome.identity.clearAllCachedAuthTokens();
            
            const token = await chrome.identity.getAuthToken({ interactive: true });
            if (!token) {
                throw new Error('Authentication failed');
            }
            
            // Validate required permissions
            await this.validateRequiredPermissions(token);
            
            const userInfo = await this.getUserInfo(token);
             
            const gmailData = {
                grantedScopes: token.grantedScopes || [],
                token: typeof token === 'object' ? token.token : token,
                email: userInfo.email
            };
            await CredentialService.saveGmailData(gmailData);
            
            return gmailData;
        } catch (error) {
            if (error.message.includes('Gmail access is required')) {
                throw error;
            }
            throw new Error(ERROR_MESSAGES.GMAIL_AUTH_FAILED);
        }
    }

    static async validateRequiredPermissions(token) {
        const actualToken = typeof token === 'object' ? token.token : token;
        
        // Test Gmail API access
        try {
            const testResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1', {
                headers: { 'Authorization': `Bearer ${actualToken}` }
            });
            
            if (!testResponse.ok) {
                if (testResponse.status === 403) {
                    throw new Error('Gmail access is required for QuickERP to read OTP emails. Please grant email permissions and try again.');
                }
                throw new Error(`Gmail API access failed: ${testResponse.status}`);
            }
        } catch (error) {
            if (error.message.includes('Gmail access is required')) {
                throw error;
            }
            throw new Error('Gmail access is required for QuickERP to function. Please ensure you grant email permissions during authentication.');
        }
    }

    static async getUserInfo(token) {
        
        // Check if token is actually the token string or an object
        let actualToken = token;
        if (typeof token === 'object' && token.token) {
            actualToken = token.token;
        }
        const endpoints = [
            'https://www.googleapis.com/oauth2/v2/userinfo',
            'https://www.googleapis.com/oauth2/v1/userinfo'
        ];
        
        for (const endpoint of endpoints) {
            try {
                
                const response = await fetch(endpoint, {
                    headers: { 
                        'Authorization': `Bearer ${actualToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const userInfo = await response.json();
                    return userInfo;
                } else {
                    const errorText = await response.text();
                }
            } catch (error) {
                console.log('Endpoint failed:', endpoint, error);
                continue;
            }
        }
        
        throw new Error('Failed to retrieve user information from Gmail API. Please reconnect your Gmail account.');
    }

    static async getValidToken() {
        let gmailData = await CredentialService.getGmailData();
        if (!gmailData || !gmailData.token) {
            throw new Error('No Gmail token found. Please connect Gmail in Settings.');
        }
        
        // Try to refresh token if it's expired
        try {
            const testResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
                headers: { 'Authorization': `Bearer ${gmailData.token}` }
            });
            
            if (testResponse.status === 401) { 
                await chrome.identity.clearAllCachedAuthTokens();
                
                const newToken = await chrome.identity.getAuthToken({ interactive: false });
                if (newToken) {
                    gmailData.token = typeof newToken === 'object' ? newToken.token : newToken;
                    await CredentialService.saveGmailData(gmailData);
                } else {
                    throw new Error('Failed to refresh token');
                }
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            if (error.message.includes('401') || error.message.includes('Invalid Credentials')) {
                // Force re-authentication
                await chrome.identity.clearAllCachedAuthTokens();
                const newToken = await chrome.identity.getAuthToken({ interactive: true });
                if (newToken) {
                    gmailData.token = typeof newToken === 'object' ? newToken.token : newToken;
                    await CredentialService.saveGmailData(gmailData);
                }
            }
        }
        
        return gmailData;
    }

    static async searchEmails(query, maxResults = 10) {
        const gmailData = await this.getValidToken();
        const token = gmailData.token;
        
        const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('maxResults', maxResults.toString());
        
        const response = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
            return data.messages || [];
    }

    static async getEmailContent(messageId) {
        const gmailData = await this.getValidToken();
        const token = gmailData.token;
        
        // Fetch with format=full to get complete email content
        const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get email: ${response.status} - ${errorText}`);
        }
        
        const emailData = await response.json();
        return emailData;
    }

    static extractOTPFromEmail(emailContent) {
        try {
            let text = '';
            if (emailContent.payload.body.data) {
                text = atob(emailContent.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } else if (emailContent.payload.parts) {
                for (const part of emailContent.payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body.data) {
                        text += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                }
            }
            
            const otpPatterns = [
                /OTP[:\s]*(\d{4,8})/i,
                /verification code[:\s]*(\d{4,8})/i,
                /code[:\s]*(\d{4,8})/i,
                /is[:\s]*(\d{6})/i,
                /OTP is (\d{6})/i,
                /(\d{6})/g
            ];
            
            for (let i = 0; i < otpPatterns.length; i++) {
                const pattern = otpPatterns[i];
                const match = text.match(pattern);
                if (match) {
                    const otp = match[1] || match[0];
                    if (otp.length >= 4 && otp.length <= 8 && /^\d+$/.test(otp)) {
                        return otp;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to extract OTP from email:', error);
            return null;
        }
    }

    static async getLatestOTP(maxAttempts = 10, intervalMs = 5000, onProgress = null) {
        const query = GMAIL_CONFIG.OTP_SEARCH_QUERY;
        const startTime = Date.now();
        const otpRequestTime = Date.now();
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                onProgress?.('polling', {
                    message: 'Retrieving OTP from Gmail...',
                    attempt: attempt,
                    maxAttempts: maxAttempts,
                    timer: timeStr,
                    status: 'searching'
                });
                
                const messages = await this.searchEmails(query, 5);
                
                if (messages.length > 0) {
                    onProgress?.('polling', {
                        message: 'Found email, extracting OTP...',
                        attempt: attempt,
                        maxAttempts: maxAttempts,
                        timer: timeStr,
                        status: 'extracting'
                    });
                    
                    const latestMessage = messages[0];
                    
                    try {
                        const emailContent = await this.getEmailContent(latestMessage.id);
                        const otp = this.extractOTPFromEmail(emailContent);
                        
                        if (otp) {
                            onProgress?.('polling', {
                                message: 'OTP retrieved successfully!',
                                attempt: attempt,
                                maxAttempts: maxAttempts,
                                timer: timeStr,
                                status: 'success'
                            });
                            
                            setTimeout(() => {
                                onProgress?.('polling', {
                                    message: 'Verifying OTP with ERP...',
                                    attempt: attempt,
                                    maxAttempts: maxAttempts,
                                    timer: timeStr,
                                    status: 'verifying'
                                });
                            }, 500);
                            
                            return otp;
                        } else {
                            // console.log('No OTP found in latest email');
                        }
                    } catch (error) {
                        console.error('Error processing latest message:', error);
                    }
                }
                
                onProgress?.('polling', {
                    message: `No OTP yet, retrying in ${intervalMs/1000}s...`,
                    attempt: attempt,
                    maxAttempts: maxAttempts,
                    timer: timeStr,
                    status: 'waiting'
                });
                
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, intervalMs));
                }
            } catch (error) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                onProgress?.('polling', {
                    message: 'Error occurred while polling',
                    attempt: attempt,
                    maxAttempts: maxAttempts,
                    timer: timeStr,
                    status: 'error',
                    error: error.message
                });
                
                if (attempt === maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
        
        throw new Error('OTP not found after maximum attempts');
    }

    static async disconnect() {
        try {
            const gmailData = await CredentialService.getGmailData();
            
            if (gmailData?.token) {
                chrome.identity.removeCachedAuthToken({ token: gmailData.token });
            }
            
            await CredentialService.clearGmailData();
            return true;
        } catch (error) {
            return false;
        }
    }

    static async isConnected() {
        try {
            const gmailData = await CredentialService.getGmailData();
            return gmailData && gmailData.token;
        } catch (error) {
            return false;
        }
    }

    static async getConnectedEmail() {
        try {
            const gmailData = await CredentialService.getGmailData();
            return gmailData?.email || null;
        } catch (error) {
            return null;
        }
    }

    static async reloadExtension() {
        try {
            chrome.runtime.reload();
        } catch (error) {
            console.error('Failed to reload extension:', error);
        }
    }
}
