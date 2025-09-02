import { ERP_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { GmailService } from './GmailService.js';

export class ERPApiService {
    static async createSession() {
        const response = await fetch(ERP_CONFIG.HOMEPAGE_URL, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(ERROR_MESSAGES.NETWORK_ERROR + ' - Status: ' + response.status);
        }
        return response;
    }

    static async getSessionToken() {
        try {
            const response = await fetch(ERP_CONFIG.HOMEPAGE_URL, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to get homepage - Status: ' + response.status);
            }
            
            const html = await response.text();
            
            // Try multiple session token patterns
            const sessionTokenPatterns = [
                /id=["']sessionToken["'][^>]*value=["']([^"']+)["']/,
                /name=["']sessionToken["'][^>]*value=["']([^"']+)["']/,
                /sessionToken["'][^>]*value=["']([^"']+)["']/,
                /<input[^>]*sessionToken[^>]*value=["']([^"']+)["']/i,
                /sessionToken[^>]*=["']([^"']+)["']/i
            ];
            
            let sessionToken = null;
            for (let i = 0; i < sessionTokenPatterns.length; i++) {
                const match = html.match(sessionTokenPatterns[i]);
                if (match) {
                    sessionToken = match[1];
                    break;
                }
            }
            
            if (!sessionToken) {
                // Try to find any token-like string in the page
                const tokenMatch = html.match(/[A-F0-9]{32,}/);
                if (tokenMatch) {
                    sessionToken = tokenMatch[0];
                } else {
                    throw new Error('Session token not found in homepage');
                }
            }
            
            return sessionToken;
        } catch (error) {
            console.error('ERPApiService: Failed to get session token:', error);
            throw error;
        }
    }

    static async getSecurityQuestion(rollNumber) {
        try {
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            
            const formData = new URLSearchParams();
            formData.append('user_id', rollNumber);
            
            
            const response = await fetch(ERP_CONFIG.SECURITY_URL, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include'
            });
            
            
            
            if (!response.ok) {
                throw new Error('Failed to get security question - Status: ' + response.status);
            }
            
            const question = await response.text();
            
            if (question.trim() === 'FALSE') {
                throw new Error('Invalid Roll Number');
            }
            
            return question.trim();
        } catch (error) {
            console.error('ERPApiService: Failed to get security question:', error);
            throw error;
        }
    }

    static async getSecurityQuestions(rollNumber) {
        try {
            const questions = new Set();
            const maxAttempts = 10;
            let attempts = 0;
            
            while (questions.size < 3 && attempts < maxAttempts) {
                try {
                    const question = await this.getSecurityQuestion(rollNumber);
                    questions.add(question);
                    attempts++;
                } catch (error) {
                    // If we get an error (like invalid roll number)
                    throw error;
                }
            }
            
            if (questions.size < 3) {
                throw new Error(`Could only fetch ${questions.size} unique questions after ${maxAttempts} attempts`);
            }
            
            return Array.from(questions);
        } catch (error) {
            console.error('Failed to get security questions:', error);
            throw error;
        }
    }

    static parseSecurityQuestions(html) {
        const questions = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const questionElements = doc.querySelectorAll('select[name^="security_question"]');
        questionElements.forEach((select, index) => {
            const selectedOption = select.querySelector('option:checked');
            if (selectedOption && selectedOption.value) {
                questions.push({
                    id: index,
                    question: selectedOption.textContent.trim(),
                    name: select.name
                });
            }
        });
        
        return questions;
    }

    static async submitSecurityAnswers(answers) {
        try {
            const formData = new FormData();
            
            answers.forEach(answer => {
                formData.append(answer.name, answer.value);
            });
            
            formData.append('submit', 'Submit');
            
            const response = await fetch(ERP_CONFIG.SECURITY_URL, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
            }
            
            const text = await response.text();
            
            if (text.includes('Wrong Answer')) {
                throw new Error('Incorrect security answers');
            }
            
            if (text.includes('OTP')) {
                return { success: true, requiresOTP: true, html: text };
            }
            
            return { success: true, html: text };
        } catch (error) {
            console.error('Security answer submission failed:', error);
            throw error;
        }
    }

    static async requestOTP(credentials, sessionToken, securityAnswer) {
        try {
            const loginDetails = {
                user_id: credentials.rollNumber,
                password: credentials.password,
                answer: securityAnswer,
                typeee: 'SI',
                sessionToken: sessionToken,
                requestedUrl: ERP_CONFIG.HOMEPAGE_URL
            };
            
            const formData = new URLSearchParams();
            Object.keys(loginDetails).forEach(key => {
                formData.append(key, loginDetails[key]);
            });
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            
            
            const response = await fetch(ERP_CONFIG.OTP_URL, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to request OTP - Status: ' + response.status);
            }
            
            const result = await response.json();
            
            if (result.msg === 'ANSWER_MISMATCH') {
                throw new Error('Invalid Security Question Answer');
            }
            if (result.msg === 'PASSWORD_MISMATCH') {
                throw new Error('Invalid Password');
            }
            
            // Check for success message (OTP sent successfully)
            if (result.msg && result.msg.includes('OTP') && result.msg.includes('sent')) {
                return result;
            }
            
            // Only throw error if it's actually an error message
            if (result.msg && !result.msg.includes('sent')) {
                throw new Error(`Failed to request OTP: ${result.msg}`);
            }
            
            return result;
        } catch (error) {
            console.error('ERPApiService: Failed to request OTP:', error);
            throw error;
        }
    }

    static async submitLogin(credentials, sessionToken, otp, securityAnswer) {
        try {
            const loginDetails = {
                user_id: credentials.rollNumber,
                password: credentials.password,
                answer: securityAnswer,
                typeee: 'SI',
                sessionToken: sessionToken,
                requestedUrl: ERP_CONFIG.HOMEPAGE_URL,
                email_otp: otp
            };
            
            const formData = new URLSearchParams();
            Object.keys(loginDetails).forEach(key => {
                formData.append(key, loginDetails[key]);
            });
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };
            
            const response = await fetch(ERP_CONFIG.LOGIN_URL, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include',
                redirect: 'follow'
            });
            
            
            const text = await response.text();
            
            if (response.status === 302 || response.status === 301) {
                const location = response.headers.get('Location');
                
                if (location && location.includes('ssoToken=')) {
                    const ssoTokenMatch = location.match(/ssoToken=([^&]+)/);
                    if (ssoTokenMatch) {
                        return { success: true, ssoToken: ssoTokenMatch[1] };
                    }
                }
            }
            
            if (response.url && response.url.includes('ssoToken=')) {
                const ssoTokenMatch = response.url.match(/ssoToken=([^&]+)/);
                if (ssoTokenMatch) {
                    return { success: true, ssoToken: ssoTokenMatch[1] };
                }
            }
            
            if (text.includes('ERROR:Email OTP mismatch')) {
                throw new Error('Invalid OTP');
            }
            
            if (text.includes('Unable to send OTP due to password mismatch')) {
                throw new Error('Authentication failed - invalid credentials');
            }
            
            if (text.includes('Unable to send OTP due to security question\'s answare mismatch')) {
                throw new Error('Invalid security question answer');
            }
            
            if (text.includes('Welcome to ERP') || text.includes('welcome.jsp') || text.includes('home.jsp') || 
                text.includes('dashboard') || text.includes('Welcome') || text.includes('success')) {
                
                return { success: true, message: 'Login successful', welcomePage: true };
            }
            
            throw new Error('Login failed - no success indicators found');
        } catch (error) {
            console.error('ERPApiService: Login submission failed:', error);
            throw error;
        }
    }

    static async submitOTP(otp) {
        try {
            const formData = new FormData();
            formData.append('otp', otp);
            formData.append('submit', 'Submit');
            
            const response = await fetch(ERP_CONFIG.VERIFY_URL, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
            }
            
            const text = await response.text();
            
            if (text.includes('Invalid OTP') || text.includes('OTP Expired')) {
                throw new Error('Invalid or expired OTP');
            }
            
            if (text.includes('welcome') || text.includes('dashboard')) {
                return { success: true, loggedIn: true, html: text };
            }
            
            return { success: true, html: text };
        } catch (error) {
            console.error('OTP submission failed:', error);
            throw error;
        }
    }

    static async performFullLogin(credentials = null, onProgress = null) {
        try {
            
            if (!credentials) {
                const { StorageService } = await import('./StorageService.js');
                credentials = await StorageService.getUserData();
                if (!credentials) {
                    throw new Error('No credentials found. Please complete setup first.');
                }
            }
            
            
            onProgress?.('init', 'Getting session token');
            const sessionToken = await this.getSessionToken();
            
            onProgress?.('security', 'Getting security question');
            const securityQuestion = await this.getSecurityQuestion(credentials.rollNumber);
            
            let securityQuestionsMap = {};
            
            if (Array.isArray(credentials.securityQuestions)) {
                credentials.securityQuestions.forEach((qa, index) => {
                    if (qa && qa.question && qa.answer) {
                        securityQuestionsMap[qa.question] = qa.answer;
                    }
                });
            } else {
                securityQuestionsMap = credentials.securityQuestions || {};
            }
            
            
            let securityAnswer = securityQuestionsMap[securityQuestion];
            
            if (!securityAnswer) {
                
                const normalizeText = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
                const apiQuestionNorm = normalizeText(securityQuestion);
                
                for (const storedQuestion in securityQuestionsMap) {
                    const storedQuestionNorm = normalizeText(storedQuestion);
                    
                    // Strategy 1: Exact normalized match
                    if (apiQuestionNorm === storedQuestionNorm) {
                        securityAnswer = securityQuestionsMap[storedQuestion];
                        break;
                    }
                    
                    // Strategy 2: Contains match (either direction)
                    if (apiQuestionNorm.includes(storedQuestionNorm) || storedQuestionNorm.includes(apiQuestionNorm)) {
                        securityAnswer = securityQuestionsMap[storedQuestion];
                        break;
                    }
                    
                    // Strategy 3: Key word matching for common questions
                    const apiWords = apiQuestionNorm.split(/\s+/);
                    const storedWords = storedQuestionNorm.split(/\s+/);
                    const commonWords = apiWords.filter(word => storedWords.includes(word) && word.length > 2);
                    
                    if (commonWords.length >= 2) {
                        securityAnswer = securityQuestionsMap[storedQuestion];
                        break;
                    }
                }
                
            }
            
            if (!securityAnswer) {
                throw new Error(`No answer found for security question: "${securityQuestion}". Available questions: ${Object.keys(securityQuestionsMap).join(', ')}`);
            }
            
            
            onProgress?.('otp', 'Requesting OTP');
            await this.requestOTP(credentials, sessionToken, securityAnswer);
            
            onProgress?.('otp', 'Retrieving OTP from Gmail');
            
            let loginResult;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
                try {
                    const otp = await GmailService.getLatestOTP(10, 5000, (step, data) => {
                        if (step === 'polling') {
                            onProgress?.('polling', data);
                        }
                    });
                    
                    onProgress?.('polling', {
                        message: 'Logging into ERP system...',
                        status: 'logging_in'
                    });
                    loginResult = await this.submitLogin(credentials, sessionToken, otp, securityAnswer);
                    
                    // If we get here, login was successful
                    break;
                    
                } catch (error) {
                    attempts++;
                    
                    if (error.message === 'Invalid OTP' && attempts < maxAttempts) {
                        onProgress?.('otp', `Invalid OTP, waiting for new one (${attempts}/${maxAttempts})...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } else {
                        // Either not an OTP error, or we've exhausted attempts
                        throw error;
                    }
                }
            }
            
            if (!loginResult) {
                throw new Error(`Login failed after ${maxAttempts} OTP attempts`);
            }
             
            return { ...loginResult, sessionToken };
        } catch (error) {
            console.error('ERPApiService: Full login failed with error:', error);
            console.error('ERPApiService: Error stack:', error.stack);
            throw error;
        }
    }

    static async solveCaptcha(captchaUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const captchaText = this.processCaptchaImage(imageData); 
                    resolve(captchaText || '0000');
                } catch (error) {
                    console.error('ERPApiService: Captcha processing failed:', error);
                    resolve('0000'); // Fallback
                }
            };
            
            img.onerror = (error) => {
                console.error('ERPApiService: Failed to load captcha image:', error);
                resolve('0000'); // Fallback
            };
            
            img.src = captchaUrl;
        });
    }

    static processCaptchaImage(imageData) {
        const { data, width, height } = imageData;
        let text = '';
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness < 128) {
                    text += '1';
                } else {
                    text += '0';
                }
            }
        }
        
        const patterns = {
            '0': /111101101101111/,
            '1': /001001001001001/,
            '2': /111001111100111/,
            '3': /111001111001111/,
            '4': /101101111001001/,
            '5': /111100111001111/,
            '6': /111100111101111/,
            '7': /111001001001001/,
            '8': /111101111101111/,
            '9': /111101111001111/
        };
        
        let result = '';
        for (let i = 0; i < 4; i++) {
            const segment = text.substring(i * 15, (i + 1) * 15);
            for (const [digit, pattern] of Object.entries(patterns)) {
                if (pattern.test(segment)) {
                    result += digit;
                    break;
                }
            }
        }
        
        return result.length === 4 ? result : Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    }

    static matchSecurityAnswers(questions, savedAnswers) {
        return questions.map(question => {
            const saved = savedAnswers.find(sa => {
                const savedQ = sa.question.toLowerCase().trim();
                const currentQ = question.question.toLowerCase().trim();
                return savedQ === currentQ || 
                       savedQ.includes(currentQ.substring(0, 15)) ||
                       currentQ.includes(savedQ.substring(0, 15));
            });
            
            return {
                name: question.name,
                value: saved?.answer || ''
            };
        });
    }

    static async openAuthenticatedERP(session) {
        try {
            const authenticatedUrl = `${ERP_CONFIG.HOMEPAGE_URL}?ssoToken=${session.ssoToken}`;
            
            const tab = await chrome.tabs.create({
                url: authenticatedUrl,
                active: true
            });
            return tab;
        } catch (error) {
            console.error('Failed to open ERP:', error);
            throw error;
        }
    }

}
