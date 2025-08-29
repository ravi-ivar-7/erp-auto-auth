import { STORAGE_KEYS } from '../config/constants.js';

export class StorageService {
    static _encryptionKey = null;
    
    static async getEncryptionKey() {
        if (this._encryptionKey) return this._encryptionKey;
        
        const storedKey = await chrome.storage.local.get('_key');
        
        if (storedKey._key) {
            this._encryptionKey = await crypto.subtle.importKey(
                'raw',
                new Uint8Array(storedKey._key),
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );
        } else {
            this._encryptionKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            
            const exportedKey = await crypto.subtle.exportKey('raw', this._encryptionKey);
            await chrome.storage.local.set({ '_key': Array.from(new Uint8Array(exportedKey)) });
        }
        
        return this._encryptionKey;
    }
    
    static async encrypt(data) {
        const key = await this.getEncryptionKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
        
        return {
            data: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv)
        };
    }
    
    static async decrypt(encryptedData) {
        const key = await this.getEncryptionKey();
        const { data, iv } = encryptedData;
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            key,
            new Uint8Array(data)
        );
        
        return JSON.parse(new TextDecoder().decode(decrypted));
    }
    
    static isEncrypted(value) {
        return value && typeof value === 'object' && value.data && value.iv;
    }
    
    static async get(key) {
        const result = await chrome.storage.local.get(key);
        const value = result[key];
        
        if (!value) return null;
        if (key.startsWith('_') || key === 'gmail_data') return value;
        if (this.isEncrypted(value)) return await this.decrypt(value);
        
        return value;
    }
    
    static async set(key, value) {
        let dataToStore = value;
        
        if (!key.startsWith('_') && key !== 'gmail_data') {
            dataToStore = await this.encrypt(value);
        }
        
        await chrome.storage.local.set({ [key]: dataToStore });
        return true;
    }
    
    static async remove(key) {
        await chrome.storage.local.remove(key);
        return true;
    }
    
    static async clear() {
        this._encryptionKey = null;
        await chrome.storage.local.clear();
        return true;
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
