import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        if (window.__initialized) return;
        window.__initialized = true;
        this.ai = new AIEngine();
        this.isSending = false;
        this.init();
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        // 상태 배지를 강제로 온라인으로 고정 (UI 표시 오류 방지)
        this.updateOnlineStatus(true); 
        this.startAI();
    }

    initElements() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.btnSend = document.getElementById('btn-send');
        this.aiLoading = document.getElementById('ai-loading');
        this.progressFill = document.getElementById('progress-fill');
        this.loadingText = document.getElementById('loading-text');
    }

    bindEvents() {
        this.btnSend.onclick = (e) => { e.preventDefault(); this.handleSend(); };
        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
        };
    }

    async startAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `제미나이 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요, 연호 선생님. 제미나이 기반 업무 비서입니다. 이제 질문을 남겨주시면 manual.txt를 기반으로 답변해 드립니다.');
                    }, 300);
                }
            });
        } catch (err) {
            this.loadingText.innerText = '초기화 실패. 인터넷 연결을 확인하세요.';
        }
    }

    async handleSend() {
        if (this.isSending) return;
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.isSending = true;
        this.chatInput.value = "";
        this.appendMessage('user', text);
        const aiMsgDiv = this.appendMessage('ai', '지침 확인 중...');

        try {
            const response = await this.ai.generateResponse(text, (fullText) => {
                aiMsgDiv.innerText = fullText;
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (err) {
            aiMsgDiv.innerText = "오류 발생: " + err.message;
        } finally {
            this.isSending = false;
        }
    }

    appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.innerText = text;
        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return msgDiv;
    }

    updateOnlineStatus(isOnline) {
        const badge = document.getElementById('status-badge');
        if (badge) {
            badge.innerText = isOnline ? '🟢 온라인' : '🔴 오프라인';
            badge.style.color = isOnline ? '#10b981' : '#ef4444';
        }
    }
}
new App();
