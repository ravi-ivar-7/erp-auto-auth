import { CredentialService } from '../services/CredentialService.js';
import { StorageService } from '../services/StorageService.js';
import { GmailService } from '../services/GmailService.js';

export class SettingsController {
    constructor(app) {
        this.app = app;
        this.editMode = {
            roll: false,
            password: false,
            questions: false
        };
    }

    async init() {
        // Controller initialization
    }

    async onScreenLoad() {
        this.editMode = {
            roll: false,
            password: false,
            questions: false
        };
        this.listenersAttached = false;
        
        await this.loadSettings();
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const userData = await StorageService.getUserData();
            
            this.userData = userData;
            document.getElementById('settings-roll').textContent = userData?.rollNumber || 'Not set';
            document.getElementById('settings-password').textContent = '••••••••';
            
            await this.loadGmailInfo();
            
            this.loadSecurityQuestions(userData?.securityQuestions || []);
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.app.showError('Failed to load settings');
        }
    }

    async loadGmailInfo() {
        try {
            const gmailData = await CredentialService.getGmailData();
            const disconnectBtn = document.getElementById('disconnect-gmail');
            const reconnectBtn = document.getElementById('reconnect-gmail');
            const gmailEmail = document.getElementById('gmail-email');
            const gmailStatus = document.getElementById('gmail-status');
            
            const setupBtn = document.getElementById('setup-gmail');
            
            if (gmailData && gmailData.token) {
                gmailEmail.textContent = gmailData.email || 'Connected';
                gmailStatus.textContent = 'Connected';
                disconnectBtn.style.display = 'inline-block';
                reconnectBtn.style.display = 'none';
                setupBtn.style.display = 'none';
            } else {
                gmailEmail.textContent = 'Not connected';
                gmailStatus.textContent = 'Disconnected';
                disconnectBtn.style.display = 'none';
                reconnectBtn.style.display = 'none';
                setupBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Failed to load Gmail info:', error);
        }
    }

    loadSecurityQuestions(questions) {
        const container = document.getElementById('security-questions-list');
        container.innerHTML = '';
        
        questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'security-question-item';
            questionDiv.innerHTML = `
                <div class="question-text">
                    <strong>Q:</strong> ${q.question}
                </div>
                <div class="answer-row">
                    <div class="answer-text">
                        <strong>A:</strong> <span id="answer-${index}">${'•'.repeat(Math.min(q.answer.length, 20))}</span>
                    </div>
                    <button class="btn-mini" id="show-answer-${index}">👁️</button>
                </div>
            `;
            container.appendChild(questionDiv);
            
            const button = document.getElementById(`show-answer-${index}`);
            if (button) {
                button.addEventListener('click', () => this.toggleShowAnswer(index));
            }
        });
    }

    setupEventListeners() {
        if (this.listenersAttached) return;
        this.listenersAttached = true;
        
        const passwordBtn = document.getElementById('show-password');
        if (passwordBtn) {
            passwordBtn.addEventListener('click', () => {
                this.togglePassword();
            });
        }
        
        const editRollBtn = document.getElementById('edit-roll-btn');
        const editPasswordBtn = document.getElementById('edit-password-btn');
        const editQuestionsBtn = document.getElementById('edit-questions-btn');
        
        if (editRollBtn) {
            editRollBtn.addEventListener('click', () => {
                this.toggleEditMode('roll');
            });
        }
        
        if (editPasswordBtn) {
            editPasswordBtn.addEventListener('click', () => {
                this.toggleEditMode('password');
            });
        }
        
        if (editQuestionsBtn) {
            editQuestionsBtn.addEventListener('click', () => {
                this.toggleEditMode('questions');
            });
        }
        
        document.getElementById('disconnect-gmail')?.addEventListener('click', () => this.handleGmailDisconnect());
        document.getElementById('reconnect-gmail')?.addEventListener('click', () => this.handleGmailReconnect());
        document.getElementById('setup-gmail')?.addEventListener('click', () => this.handleGmailSetup());
        document.getElementById('finish-setup')?.addEventListener('click', () => this.handleFinishSetup());
        document.getElementById('back-btn')?.addEventListener('click', () => this.previousStep());
        document.getElementById('next-btn')?.addEventListener('click', () => this.handleNextStep());
        document.getElementById('reset-data')?.addEventListener('click', () => this.resetData());
        
        window.settingsController = this;
    }

    togglePassword() {
        const passwordElement = document.getElementById('settings-password');
        const passwordButton = document.getElementById('show-password');
        
        if (!passwordElement || !passwordButton || !this.userData) {
            return;
        }
        
        const isHidden = passwordElement.textContent === '••••••••';
        
        if (isHidden) {
            passwordElement.textContent = this.userData.password || 'Not set';
            passwordButton.textContent = '🙈';
        } else {
            passwordElement.textContent = '••••••••';
            passwordButton.textContent = '👁️';
        }
    }
    
    toggleShowAnswer(index) {
        if (!this.userData?.securityQuestions) return;
        
        const element = document.getElementById(`answer-${index}`);
        const button = document.getElementById(`show-answer-${index}`);
        const question = this.userData.securityQuestions[index];
        
        if (!element || !button || !question) return;
        
        const isShowing = !element.textContent.includes('•');
        
        if (isShowing) {
            element.textContent = '•'.repeat(Math.min(question.answer.length, 20));
            button.textContent = '👁️';
        } else {
            element.textContent = question.answer;
            button.textContent = '🙈';
            
            // Auto-hide
            setTimeout(() => {
                if (!element.textContent.includes('•')) {
                    element.textContent = '•'.repeat(Math.min(question.answer.length, 20));
                    button.textContent = '👁️';
                }
            }, 7000);
        }
    }

    async reconnectGmail() {
        try {
            const button = document.getElementById('reconnect-gmail');
            button.disabled = true;
            button.textContent = 'Connecting...';
            
            await GmailService.disconnect();
            const tokenData = await GmailService.authenticate();
            
            document.getElementById('gmail-email').textContent = tokenData.email;
            button.textContent = 'Reconnect';
            button.disabled = false;
            
            this.app.showSuccess('Gmail reconnected successfully');
        } catch (error) {
            console.error('Gmail reconnection failed:', error);
            this.app.showError('Failed to reconnect Gmail');
            
            const button = document.getElementById('reconnect-gmail');
            button.disabled = false;
            button.textContent = 'Reconnect';
        }
    }

    toggleEditMode(field) {
        switch (field) {
            case 'roll':
                this.toggleRollEdit();
                break;
            case 'password':
                this.togglePasswordEdit();
                break;
            case 'questions':
                this.toggleQuestionsEdit();
                break;
        }
    }

    toggleRollEdit() {
        
        const valueSpan = document.getElementById('settings-roll');
        const input = document.getElementById('edit-roll');
        const button = document.getElementById('edit-roll-btn');
        
        
        if (!valueSpan || !input || !button) {
            console.error('Missing elements for roll edit');
            this.app.showError('Edit elements not found');
            return;
        }
        
        if (!this.editMode.roll) {
            input.value = this.userData?.rollNumber || '';
            valueSpan.style.display = 'none';
            input.style.display = 'inline-block';
            input.focus();
            button.textContent = '💾';
            this.editMode.roll = true;
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveRollEdit();
            });
        } else {
            this.saveRollEdit();
        }
    }

    async saveRollEdit() {
        const input = document.getElementById('edit-roll');
        const valueSpan = document.getElementById('settings-roll');
        const button = document.getElementById('edit-roll-btn');
        
        
        try {
            const newRoll = input.value.trim();
            
            if (!newRoll) {
                this.app.showError('Roll number cannot be empty');
                return;
            }
            
            await CredentialService.updateUserData({ rollNumber: newRoll });
            this.userData.rollNumber = newRoll;
            
            valueSpan.textContent = newRoll;
            valueSpan.style.display = 'inline-block';
            input.style.display = 'none';
            button.textContent = '✏️';
            this.editMode.roll = false;
            
            this.app.showSuccess('Roll number updated');
        } catch (error) {
            console.error('Failed to update roll number:', error);
            this.app.showError('Failed to update roll number');
        }
    }

    togglePasswordEdit() {
        const valueSpan = document.getElementById('settings-password');
        const input = document.getElementById('edit-password');
        const button = document.getElementById('edit-password-btn');
        
        if (!this.editMode.password) {
            input.value = this.userData?.password || '';
            input.type = 'text';
            valueSpan.style.display = 'none';
            input.style.display = 'inline-block';
            input.focus();
            button.textContent = '💾';
            this.editMode.password = true;
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.savePasswordEdit();
            });
        } else {
            this.savePasswordEdit();
        }
    }

    async savePasswordEdit() {
        const input = document.getElementById('edit-password');
        const valueSpan = document.getElementById('settings-password');
        const button = document.getElementById('edit-password-btn');
        
        try {
            const newPassword = input.value.trim();
            if (!newPassword) {
                this.app.showError('Password cannot be empty');
                return;
            }
            
            if (newPassword.length < 6) {
                this.app.showError('Password must be at least 6 characters');
                return;
            }
            
            await CredentialService.updateUserData({ password: newPassword });
            this.userData.password = newPassword;
            
            valueSpan.textContent = '••••••••';
            valueSpan.style.display = 'inline-block';
            input.style.display = 'none';
            input.type = 'password'; 
            button.textContent = '✏️';
            this.editMode.password = false;
            
            this.app.showSuccess('Password updated');
        } catch (error) {
            console.error('Failed to update password:', error);
            this.app.showError('Failed to update password');
        }
    }

    toggleQuestionsEdit() {
        const button = document.getElementById('edit-questions-btn');
        const container = document.getElementById('security-questions-list');
        
        if (!this.editMode.questions) {
            this.renderEditableQuestions();
            button.textContent = '💾 Save';
            this.editMode.questions = true;
        } else {
            this.saveQuestionsEdit();
        }
    }

    renderEditableQuestions() {
        const container = document.getElementById('security-questions-list');
        const questions = this.userData?.securityQuestions || [];
        
        container.innerHTML = '';
        
        questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'security-question-edit';
            questionDiv.innerHTML = `
                <div class="question-edit-row">
                    <label>Question ${index + 1}:</label>
                    <input type="text" class="question-input" data-index="${index}" value="${q.question}">
                </div>
                <div class="answer-edit-row">
                    <label>Answer:</label>
                    <input type="text" class="answer-input" data-index="${index}" value="${q.answer}">
                    <button class="btn-mini btn-danger delete-question">🗑️</button>
                </div>
            `;
            container.appendChild(questionDiv);
            
            const deleteBtn = questionDiv.querySelector('.delete-question');
            deleteBtn.addEventListener('click', () => {
                questionDiv.remove();
            });
        });
        
        const addButton = document.createElement('button');
        addButton.className = 'btn-mini add-question-btn';
        addButton.id = 'add-question-btn';
        addButton.textContent = '➕ Add Question';
        addButton.addEventListener('click', () => this.addNewQuestion());
        container.appendChild(addButton);
    }

    addNewQuestion() {
        const container = document.getElementById('security-questions-list');
        const questionCount = container.querySelectorAll('.security-question-edit').length;
        
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'security-question-edit';
        questionDiv.innerHTML = `
            <div class="question-edit-row">
                <label>Question ${questionCount + 1}:</label>
                <input type="text" class="question-input" data-index="${questionCount}" placeholder="Enter security question">
            </div>
            <div class="answer-edit-row">
                <label>Answer:</label>
                <input type="text" class="answer-input" data-index="${questionCount}" placeholder="Enter answer">
                <button class="btn-mini btn-danger delete-question">🗑️</button>
            </div>
        `;

        const deleteBtn = questionDiv.querySelector('.delete-question');
        deleteBtn.addEventListener('click', () => {
            questionDiv.remove();
        });
        
        const addButton = document.getElementById('add-question-btn');
        if (addButton && addButton.parentNode === container) {
            container.insertBefore(questionDiv, addButton);
        } else {
            container.appendChild(questionDiv);
        }
    }

    async saveQuestionsEdit() {
        const container = document.getElementById('security-questions-list');
        const questionInputs = container.querySelectorAll('.question-input');
        const answerInputs = container.querySelectorAll('.answer-input');
        const button = document.getElementById('edit-questions-btn');
        
        try {
            const newQuestions = [];
            
            for (let i = 0; i < questionInputs.length; i++) {
                const question = questionInputs[i].value.trim();
                const answer = answerInputs[i].value.trim();
                
                if (question && answer) {
                    newQuestions.push({
                        question,
                        answer,
                        id: CredentialService.generateSecurityQuestionId(question)
                    });
                }
            }
            
            if (newQuestions.length === 0) {
                this.app.showError('At least one security question is required');
                return;
            }
            
            await CredentialService.updateUserData({ securityQuestions: newQuestions });
            this.userData.securityQuestions = newQuestions;
            
            this.loadSecurityQuestions(newQuestions);
            button.textContent = '✏️ Edit';
            this.editMode.questions = false;
            
            this.app.showSuccess('Security questions updated');
        } catch (error) {
            console.error('Failed to update security questions:', error);
            this.app.showError('Failed to update security questions');
        }
    }

    async resetData() {
        const confirmed = confirm('Are you sure you want to reset all data? This cannot be undone.');
        if (!confirmed) return;
        
        try {
            const success = await this.app.getController('app').resetAllData();
            if (success) {
                this.app.showSuccess('All data has been reset');
                setTimeout(() => {
                    this.app.navigateToScreen('setup');
                }, 2000);
            } else {
                this.app.showError('Failed to reset data');
            }
        } catch (error) {
            console.error('Reset failed:', error);
            this.app.showError('Failed to reset data');
        }
    }

    
    async handleGmailDisconnect() {
        const confirmed = confirm(
            'Are you sure you want to disconnect Gmail?\n\n' +
            'This will:\n' +
            '• Remove Gmail access tokens\n' +
            '• Disable automatic OTP retrieval\n' +
            '• Require manual OTP entry for ERP login\n\n' +
            'You can reconnect Gmail anytime from settings.'
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            await StorageService.remove('gmail_data');
            
            try {
                await chrome.identity.clearAllCachedAuthTokens();
            } catch (error) {
                console.warn('Failed to clear cached tokens:', error);
            }
            
            await this.loadGmailInfo();
            this.app.showSuccess('Gmail disconnected successfully');
        } catch (error) {
            console.error('Failed to disconnect Gmail:', error);
            this.app.showError('Failed to disconnect Gmail');
        }
    }
    
    async handleGmailReconnect() {
        try {
            this.showFeedback('Connecting to Gmail...');
            
            const { GmailService } = await import('../services/GmailService.js');
            const tokenData = await GmailService.authenticate();
            
            await CredentialService.saveGmailData(tokenData);
            
            await this.loadGmailInfo();
            this.showFeedback('✓ Gmail connected');
        } catch (error) {
            console.error('Failed to reconnect Gmail:', error);
            this.showFeedback('✗ Connection failed', true);
        }
    }
    
    async handleGmailSetup() {
        this.app.navigateToScreen('setup');
        
        // Wait for setup screen to load, then navigate to Gmail step
        setTimeout(() => {
            const setupController = this.app.getController('setup');
            if (setupController && setupController.navigateToStep) {
                setupController.navigateToStep(3); 
            }
        }, 100);
    }
}
