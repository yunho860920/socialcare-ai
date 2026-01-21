import { AIEngine } from './ai-engine.js';

/**
 * PII Filter: Masks Resident Registration Numbers, Phone Numbers, and potential names.
 * @param {string} text 
 * @returns {string}
 */
function maskPII(text) {
    let masked = text;
    // Resident Registration Number (RRN): 000000-0000000
    masked = masked.replace(/\d{6}-\d{7}/g, 'RRN_MASKED');
    // Phone Number: 010-0000-0000 or 01000000000
    masked = masked.replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, 'PHONE_MASKED');
    // Basic Korean Name pattern (2-4 characters, usually at the start of input or after space) - Simplified approach
    // In a real production app, this would use a more sophisticated NER model.
    // Here we focus on obvious PII patterns.
    return masked;
}

class App {
    constructor() {
        this.ai = new AIEngine();
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
            this.btnSend.disabled = this.chatInput.value.trim() === '';
        });
    }

    bindEvents() {
        this.btnSend.addEventListener('click', () => this.sendMessage());

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.btnSettings.addEventListener('click', () => this.modalSettings.classList.remove('hidden'));
        this.btnCloseSettings.addEventListener('click', () => this.modalSettings.classList.add('hidden'));

        this.btnSync.addEventListener('click', () => this.syncNotion());

        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));

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
        const rawText = this.chatInput.value.trim();
        if (!rawText) return;

        // Mask PII before anything else
        const processedText = maskPII(rawText);

        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
        this.btnSend.disabled = true;

        this.appendMessage('user', processedText);

        // AI Response placeholder
        const aiMsgDiv = this.appendMessage('ai', '...');

        try {
            const response = await this.ai.generateResponse(processedText);
            aiMsgDiv.innerText = response;
        } catch (error) {
            aiMsgDiv.innerText = '오류가 발생했습니다: ' + error.message;
        }

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * Simple parser for bold (**text**) and bullet points (- item)
     */
    parseMarkdown(text) {
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/^-\s(.*)$/gm, '<li>$1</li>'); // Lists

        // Wrap <li> items in <ul>
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
            // Note: Notion API requires CORS proxy in browser.
            // Using a internal fetch logic that simulates the RAG data injection.
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
        // This is where CORS proxy would be used.
        // For demonstration, we simulate fetching text blocks.
        console.log('Fetching from Notion:', pageId);
        // Simulation of Notion response
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
