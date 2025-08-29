import { GMAIL_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { CredentialService } from './CredentialService.js';
import { StorageService } from './StorageService.js';

export class GmailService {
    static async authenticate(customClientId = null) {
        try {
            await chrome.identity.clearAllCachedAuthTokens();
            
            const token = await chrome.identity.getAuthToken({ interactive: true });
            if (!token) {
                throw new Error('Authentication failed');
            }
            
            const userInfo = await this.getUserInfo(token);
            
            // Store in format matching existing data
            const gmailData = {
                grantedScopes: token.grantedScopes || [],
                token: typeof token === 'object' ? token.token : token,
                email: userInfo.email
            };
            await CredentialService.saveGmailData(gmailData);
            
            return gmailData;
        } catch (error) {
            console.error('Gmail authentication failed:', error);
            throw new Error(ERROR_MESSAGES.GMAIL_AUTH_FAILED);
        }
    }

    static async updateManifestClientId(clientId) {
        // Chrome extensions cannot dynamically update manifest.json at runtime
        // The client_id is read-only once the extension is loaded
        // This method exists for future reference but doesn't actually work
        console.warn('Cannot update manifest client_id at runtime. Extension must be reloaded with updated manifest.json');
        return false;
    }

    static async getUserInfo(token) {
        
        // Check if token is actually the token string or an object
        let actualToken = token;
        if (typeof token === 'object' && token.token) {
            actualToken = token.token;
        }
        
        // Try userinfo endpoints with the actual token
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
                
                console.log('Response status:', response.status);
                
                if (response.ok) {
                    const userInfo = await response.json();
                    console.log('User info received:', userInfo);
                    return userInfo;
                } else {
                    const errorText = await response.text();
                }
            } catch (error) {
                console.log('Endpoint failed:', endpoint, error);
                continue;
            }
        }
        
        // If all endpoints fail, use a minimal user info based on token
        console.warn('All userinfo endpoints failed, using minimal user info');
        return {
            email: 'authenticated@gmail.com',
            verified_email: true,
            id: 'chrome_extension_user'
        };
    }

    static async getValidToken() {
        const gmailData = await CredentialService.getGmailData();
        if (!gmailData || !gmailData.token) {
            throw new Error('No Gmail token found. Please connect Gmail in Settings.');
        }
        return gmailData;
    }

    static async searchEmails(query, maxResults = 10) {
        const gmailData = await this.getValidToken();
        const token = gmailData.token;
        console.log('Gmail token being used:', token ? token.substring(0, 20) + '...' : 'null');
        
        const searchUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('maxResults', maxResults.toString());
        console.log('Gmail API URL:', searchUrl.toString());
        
        const response = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Gmail API response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gmail API error details:', errorText);
            throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Gmail API response data:', data);
        return data.messages || [];
    }

    static async getEmailContent(messageId) {
        const gmailData = await this.getValidToken();
        const token = gmailData.token;
        console.log('Fetching email content for message ID:', messageId);
        
        // Fetch with format=full to get complete email content
        const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Email content response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Email fetch error:', errorText);
            throw new Error(`Failed to get email: ${response.status} - ${errorText}`);
        }
        
        const emailData = await response.json();
        console.log('RAW EMAIL DATA:', JSON.stringify(emailData, null, 2));
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
            
            console.log('Email text content:', text.substring(0, 500));
            
            const otpPatterns = [
                /OTP[:\s]*(\d{4,8})/i,
                /verification code[:\s]*(\d{4,8})/i,
                /code[:\s]*(\d{4,8})/i,
                /is[:\s]*(\d{6})/i,
                /OTP is (\d{6})/i,
                /(\d{6})/g
            ];
            
            console.log('Trying OTP extraction patterns on text:', text);
            
            for (let i = 0; i < otpPatterns.length; i++) {
                const pattern = otpPatterns[i];
                const match = text.match(pattern);
                console.log(`Pattern ${i + 1} (${pattern}):`, match);
                if (match) {
                    const otp = match[1] || match[0];
                    console.log(`Found potential OTP: "${otp}" (length: ${otp.length})`);
                    if (otp.length >= 4 && otp.length <= 8 && /^\d+$/.test(otp)) {
                        console.log(`Valid OTP extracted: ${otp}`);
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
        console.log('Starting OTP search with query:', query);
        const startTime = Date.now();
        const otpRequestTime = Date.now(); // Track when OTP was requested
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                console.log(`Polling for OTP - Attempt ${attempt}/${maxAttempts}`);
                
                // Update progress callback with polling status
                onProgress?.('polling', {
                    message: 'Retrieving OTP from Gmail...',
                    attempt: attempt,
                    maxAttempts: maxAttempts,
                    timer: timeStr,
                    status: 'searching'
                });
                
                const messages = await this.searchEmails(query, 5);
                console.log(`Found ${messages.length} messages matching query:`, query);
                
                if (messages.length > 0) {
                    onProgress?.('polling', {
                        message: 'Found email, extracting OTP...',
                        attempt: attempt,
                        maxAttempts: maxAttempts,
                        timer: timeStr,
                        status: 'extracting'
                    });
                    
                    // Check all recent emails for OTP - just get the latest one
                    const latestMessage = messages[0];
                    
                    try {
                        const emailContent = await this.getEmailContent(latestMessage.id);
                        const otp = this.extractOTPFromEmail(emailContent);
                        
                        if (otp) {
                            console.log('OTP found:', otp);
                            onProgress?.('polling', {
                                message: 'OTP retrieved successfully!',
                                attempt: attempt,
                                maxAttempts: maxAttempts,
                                timer: timeStr,
                                status: 'success'
                            });
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
                console.error('Error polling for OTP:', error);
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
