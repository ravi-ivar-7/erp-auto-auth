import { StorageService } from './StorageService.js';

export class CredentialService {

    static async saveUserData(rollNumber, password, securityQuestions) {
        try {
            const credentials = {
                rollNumber,
                password,
                securityQuestions,
                timestamp: Date.now()
            };
            
            return await StorageService.setUserData(credentials);
        } catch (error) {
            console.error('Failed to save credentials:', error);
            return false;
        }
    }

    static async saveERPSession(sessionData) {
        try {
            const erpSession = {
                sessionToken: sessionData.sessionToken,
                ssoToken: sessionData.ssoToken,
                cookies: sessionData.cookies,
                timestamp: Date.now(),
                expiresAt: sessionData.expiresAt || (Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
            };
            
            return await StorageService.set('erp_session', erpSession);
        } catch (error) {
            console.error('Failed to save ERP session:', error);
            return false;
        }
    }

    static async getERPSession() {
        try {
            const session = await StorageService.get('erp_session');
            if (!session) return null;
            
            // Check if session is expired
            if (session.expiresAt && Date.now() > session.expiresAt) {
                await this.clearERPSession();
                return null;
            }
            
            return session;
        } catch (error) {
            console.error('Failed to get ERP session:', error);
            return null;
        }
    }

    static async clearERPSession() {
        try {
            return await StorageService.remove('erp_session');
        } catch (error) {
            console.error('Failed to clear ERP session:', error);
            return false;
        }
    }

    static async getUserData() {
        try {
            return await StorageService.getUserData();
        } catch (error) {
            console.error('Failed to get user data:', error);
            return null;
        }
    }

    static async updateUserData(updates) {
        try {
            const existing = await this.getUserData();
            if (!existing) return false;
            
            const updated = { ...existing, ...updates };
            return await StorageService.setUserData(updated);
        } catch (error) {
            console.error('Failed to update user data:', error);
            return false;
        }
    }

    static async clearUserData() {
        return await StorageService.remove('user_data');
    }

    static async validateUserData(rollNumber, password) {
        if (!rollNumber || !password) return false;
        if (rollNumber.length < 8 || password.length < 6) return false;
        return true;
    }

    static generateSecurityQuestionId(question) {
        return question.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20);
    }

    static async saveGmailData(gmailData) {
        try {
            return await StorageService.set('gmail_data', gmailData);
        } catch (error) {
            console.error('Failed to save Gmail data:', error);
            return false;
        }
    }

    static async getGmailData() {
        try {
            return await StorageService.get('gmail_data');
        } catch (error) {
            console.error('Failed to get Gmail data:', error);
            return null;
        }
    }

    static async clearGmailData() {
        try {
            return await StorageService.remove('gmail_data');
        } catch (error) {
            console.error('Failed to clear Gmail data:', error);
            return false;
        }
    }
}
