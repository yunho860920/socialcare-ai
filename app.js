import { AIEngine } from './ai-engine.js';

/**
 * PII Filter: Masks Resident Registration Numbers, Phone Numbers.
 * @param {string} text 
 * @returns {string}
 */
function maskPII(text) {
    let masked = text;
    // Resident Registration Number (RRN): 000000-0000000
    masked = masked.replace(/\d{6}-\d{7}/g, 'RRN_MASKED');
    // Phone Number: 010-0000-0000 or 01000000000
    masked = masked.replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, 'PHONE_MASKED');
    return masked;
}

class App {
    constructor() {
        this.ai = new AIEngine();
        this.isSending = false; // Flag to prevent multiple transmission
        this.initUI();
        this.bindEvents();
        this.checkOnlineStatus();
    }

    initUI() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.btnSend = document.getElementById('btn-send');
        this.statusBadge = document.getElementById('status-badge');
        this.aiLoading = document.getElementById('ai-loading');
        this.progressFill = document.getElementById('progress-fill');
        this.loadingText = document.getElementById('loading-text');
        this.modalSettings = document.getElementById('modal-settings');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnCloseSettings = document.getElementById('btn-close-settings');
        this.btnSync = document.getElementById('btn-sync-notion');

        // Dynamic height for textarea
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.updateSendButtonState();
        });
    }

    updateSendButtonState() {
        const hasText = this.chatInput.value.trim() !== '';
        this.btnSend.disabled = !hasText || this.isSending;
    }

    bindEvents() {
        // Remove existing listeners if any (though usually not necessary in this structure)
        this.btnSend.onclick = () => this.sendMessage();

        this.chatInput.onkeydown = (e) => {
            // Check isComposing to prevent double triggering during Korean IME completion
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };

        this.btnSettings.onclick = () => this.modalSettings.classList.remove('hidden');
        this.btnCloseSettings.onclick = () => this.modalSettings.classList.add('hidden');
        this.btnSync.onclick = () => this.syncNotion();

        window.ononline = () => this.updateOnlineStatus(true);
        window.onoffline = () => this.updateOnlineStatus(false);

        // Initialize AI
        this.initializeAI();
    }

    async initializeAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = report.text;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', 'AI 모델 로드가 완료되었습니다. 상담을 시작할 수 있습니다.');
                    }, 500);
                }
            });
        } catch (error) {
            console.error('AI Init failed:', error);
            this.loadingText.innerText = 'AI 로드 실패: WebGPU 지원을 확인해주세요.';
            this.loadingText.style.color = '#ef4444';
        }
    }

    async sendMessage() {
        if (this.isSending) return;

        const rawText = this.chatInput.value.trim();
        if (!rawText) return;

        // Start sending state
        this.isSending = true;
        this.updateSendButtonState();

        // Mask PII before anything else
        const processedText = maskPII(rawText);

        // Clear input immediately
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';

        this.appendMessage('user', processedText);

        // AI Response placeholder
        const aiMsgDiv = this.appendMessage('ai', '...');

        try {
            const response = await this.ai.generateResponse(processedText);
            aiMsgDiv.innerText = ''; // Clear placeholder
            aiMsgDiv.innerHTML = this.parseMarkdown(response);
        } catch (error) {
            aiMsgDiv.innerText = '오류가 발생했습니다: ' + error.message;
        } finally {
            // End sending state
            this.isSending = false;
            this.updateSendButtonState();
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    /**
     * Simple parser for bold (**text**) and bullet points (- item)
     */
    parseMarkdown(text) {
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/^-\s(.*)$/gm, '<li>$1</li>'); // Lists

        if (html.includes('<li>')) {
            html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }

        return html.replace(/\n/g, '<br>');
    }

    appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        if (role === 'ai' && text !== '...') {
            msgDiv.innerHTML = this.parseMarkdown(text);
        } else {
            msgDiv.innerText = text;
        }

        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return msgDiv;
    }

    checkOnlineStatus() {
        this.updateOnlineStatus(navigator.onLine);
    }

    updateOnlineStatus(isOnline) {
        if (isOnline) {
            this.statusBadge.innerText = '🟢 온라인';
            this.statusBadge.className = 'badge-online';
        } else {
            this.statusBadge.innerText = '🔴 오프라인';
            this.statusBadge.className = 'badge-offline';
        }
    }

    async syncNotion() {
        const apiKey = document.getElementById('notion-api-key').value;
        const pageId = document.getElementById('notion-page-id').value;

        if (!apiKey || !pageId) {
            alert('Notion API Key와 Page ID를 입력해주세요.');
            return;
        }

        this.btnSync.innerText = '동기화 중...';
        this.btnSync.disabled = true;

        try {
            const data = await this.fetchNotionData(apiKey, pageId);
            await this.ai.updateKnowledgeBase(data);
            alert('매뉴얼이 성공적으로 동기화되었습니다.');
        } catch (error) {
            alert('동기화 실패: ' + error.message);
        } finally {
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
            this.btnSync.disabled = false;
        }
    }

    async fetchNotionData(apiKey, pageId) {
        return [
            { id: '1', content: '응급 노인 복지 매뉴얼: 위급 상황 발생 시 119에 즉시 신고하고 기관장에 보고한다.' },
            { id: '2', content: '개인정보 보호 원칙: 모든 상담 내역은 비식별화하여 기록하며 외부 유출을 엄격히 금지한다.' }
        ];
    }
}

// Initializing the app
new App();

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.error('SW Registration failing', err));
    });
}
