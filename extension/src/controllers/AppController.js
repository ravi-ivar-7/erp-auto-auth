import { StorageService } from '../services/StorageService.js'; 
import { GmailService } from '../services/GmailService.js';

export class AppController {
    constructor(app) {
        this.app = app;
    }

    async init() {
        await this.loadUserInfo();
    }

    async isValidSetup() {
        try {
            const userData = await StorageService.getUserData();
            const gmailConnected = await GmailService.isConnected();
                
            // Check if basic credentials exist
            const hasCredentials = userData && userData.rollNumber && userData.password;
            
            return {
                hasCredentials,
                hasGmail: gmailConnected,
                isValid: hasCredentials && gmailConnected,
                missingCredentials: !hasCredentials,
                missingGmail: !gmailConnected
            };
        } catch (error) {
            console.error('Setup validation failed:', error);
            return {
                hasCredentials: false,
                hasGmail: false,
                isValid: false,
                missingCredentials: true,
                missingGmail: true
            };
        }
    }

    async loadUserInfo() {
        try {
            const userData = await StorageService.getUserData();
            const gmailConnected = await GmailService.isConnected();
            const lastLogin = await StorageService.getLastLogin();
            
            this.userInfo = {
                rollNumber: userData?.rollNumber || null,
                gmailEmail: await GmailService.getConnectedEmail(),
                gmailConnected,
                lastLogin: lastLogin ? new Date(lastLogin) : null,
                setupComplete: userData && userData.rollNumber && userData.password
            };
        } catch (error) {
            console.error('Failed to load user info:', error);
            this.userInfo = {
                rollNumber: null,
                gmailEmail: null,
                gmailConnected: false,
                lastLogin: null,
                setupComplete: false
            };
        }
    }

    getUserInfo() {
        return this.userInfo;
    }

    async getUserData() {
        return await StorageService.getUserData();
    }

    async resetAllData() {
        try {
            await StorageService.clear();
            await GmailService.disconnect();
            this.userInfo = {
                rollNumber: null,
                gmailEmail: null,
                gmailConnected: false,
                lastLogin: null,
                setupComplete: false
            };
            return true;
        } catch (error) {
            console.error('Failed to reset data:', error);
            return false;
        }
    }

    formatLastLogin(timestamp) {
        if (!timestamp) return 'Never';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    async updateLastLogin() {
        await StorageService.setLastLogin();
        await this.loadUserInfo();
    }
}
