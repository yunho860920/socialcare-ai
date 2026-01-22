/**
 * app.js - 캐시 무력화 적용 버전
 */

// 👇 [이 부분이 핵심입니다!] 뒤에 ?v=final2 를 꼭 붙여주세요.
import { AIEngine } from './ai-engine.js?v=final2';

class App {
    constructor() {
        if (window.__initialized) return;
        window.__initialized = true;
        this.ai = new AIEngine();
        this.isSending = false;
        this.init();
    }
    
    // ... (나머지 코드는 기존과 동일하므로 그대로 두셔도 됩니다) ...
    
    async init() {
        this.initElements();
        this.bindEvents();
        this.updateOnlineStatus(navigator.onLine);
        this.startAI();
    }

    initElements() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.btnSend = document.getElementById('btn-send');
        this.statusBadge = document.getElementById('status-badge');
        this.aiLoading = document.getElementById('ai-loading');
        this.progressFill = document.getElementById('progress-fill');
        this.loadingText = document.getElementById('loading-text');
    }

    bindEvents() {
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
        this.btnSend.onclick = (e) => { e.preventDefault(); this.handleSend(); };
        this.chatInput.onkeydown = (e) => {
             if (e.isComposing || e.keyCode === 229) return;
             if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
        };
    }

    updateOnlineStatus(isOnline) {
        if (!this.statusBadge) return;
        this.statusBadge.innerText = isOnline ? '🟢 온라인' : '🔴 오프라인';
        this.statusBadge.className = isOnline ? 'badge-online' : 'badge-offline';
        this.statusBadge.style.color = isOnline ? '#10b981' : '#ef4444';
    }

    async startAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `AI 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요! Gemini Pro 기반 업무 비서입니다. 이제 정말 됩니다!');
                    }, 500);
                }
            });
        } catch (e) { this.loadingText.innerText = '초기화 실패'; }
    }

    async handleSend() {
        if (this.isSending) return;
        const text = this.chatInput.value.trim();
        if (!text) return;
        this.isSending = true;
        this.chatInput.value = "";
        this.appendMessage('user', text);
        const aiMsg = this.appendMessage('ai', '...');
        try {
            await this.ai.generateResponse(text, (chunk) => aiMsg.innerText = chunk);
        } catch (e) { aiMsg.innerText = "오류: " + e.message; }
        finally { this.isSending = false; }
    }

    appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerText = text;
        document.getElementById('chat-messages').appendChild(div);
        return div;
    }
}
new App();
