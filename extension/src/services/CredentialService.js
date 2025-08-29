import { StorageService } from './StorageService.js';

export class CredentialService {

    static async saveUserData(rollNumber, password, securityQuestions) {
        const credentials = {
            rollNumber,
            password,
            securityQuestions,
            timestamp: Date.now()
        };
        
        return await StorageService.setUserData(credentials);
    }

    static async saveERPSession(sessionData) {
        const erpSession = {
            sessionToken: sessionData.sessionToken,
            ssoToken: sessionData.ssoToken,
            cookies: sessionData.cookies,
            timestamp: Date.now(),
            expiresAt: sessionData.expiresAt || (Date.now() + 10 * 60 * 1000) // 10 minutes expiration
        };
        
        return await StorageService.set('erp_session', erpSession);
    }

    static async getERPSession() {
        const session = await StorageService.get('erp_session');
        if (!session) return null;
        
        if (session.expiresAt && Date.now() > session.expiresAt) {
            await this.clearERPSession();
            return null;
        }
        
        return session;
    }

    static async clearERPSession() {
        return await StorageService.remove('erp_session');
    }

    static async getUserData() {
        return await StorageService.getUserData();
    }

    static async updateUserData(updates) {
        const existing = await this.getUserData();
        if (!existing) return false;
        
        const updated = { ...existing, ...updates };
        return await StorageService.setUserData(updated);
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
        return await StorageService.set('gmail_data', gmailData);
    }

    static async getGmailData() {
        return await StorageService.get('gmail_data');
    }

    static async clearGmailData() {
        return await StorageService.remove('gmail_data');
    }

    static async isERPSessionValid() {
        const session = await StorageService.get('erp_session');
        if (!session) return false;
        
        return session.expiresAt && Date.now() < session.expiresAt;
    }

    static async getSessionTimeRemaining() {
        const session = await StorageService.get('erp_session');
        if (!session || !session.expiresAt) return 0;
        
        const remaining = session.expiresAt - Date.now();
        return Math.max(0, remaining);
    }

    static formatTimeRemaining(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
