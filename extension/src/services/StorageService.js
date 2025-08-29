
import { STORAGE_KEYS } from '../config/constants.js';

export class StorageService {
    static async get(key) {
        try {
            const result = await chrome.storage.local.get(key);
            return result[key];
        } catch (error) {
            console.error(`Failed to get storage key ${key}:`, error);
            return null;
        }
    }

    static async set(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
            return true;
        } catch (error) {
            console.error(`Failed to set storage key ${key}:`, error);
            return false;
        }
    }

    static async remove(key) {
        try {
            await chrome.storage.local.remove(key);
            return true;
        } catch (error) {
            console.error(`Failed to remove storage key ${key}:`, error);
            return false;
        }
    }

    static async clear() {
        try {
            await chrome.storage.local.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    static async getUserData() {
        return await this.get(STORAGE_KEYS.USER_DATA);
    }

    static async setUserData(userData) {
        return await this.set(STORAGE_KEYS.USER_DATA, userData);
    }

    static async getLastLogin() {
        return await this.get(STORAGE_KEYS.LAST_LOGIN);
    }

    static async setLastLogin(timestamp = Date.now()) {
        return await this.set(STORAGE_KEYS.LAST_LOGIN, timestamp);
    }
}
