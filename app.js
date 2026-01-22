// 👇 import 주소 끝에 ?v=final5 를 꼭 확인하세요!
import { AIEngine } from './ai-engine.js?v=final5';

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
        this.updateOnlineStatus(true);
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
        this.statusBadge.style.color = isOnline ? '#10b981' : '#ef4444';
        this.statusBadge.className = isOnline ? 'badge-online' : 'badge-offline';
    }

    async startAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `진단 모드 V5 준비 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 진단 기능 V5가 준비되었습니다. 질문을 입력하면 모델 목록을 확인합니다.');
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
        
        // AI 메시지 박스를 미리 만들고 변수에 저장
        const aiMsg = this.appendMessage('ai', '...');
        
        try {
            // 결과값(chunk)이 오면 aiMsg의 텍스트를 바로바로 바꿉니다.
            await this.ai.generateResponse(text, (chunk) => {
                aiMsg.innerText = chunk;
            });
        } catch (e) { 
            aiMsg.innerText = "치명적 오류: " + e.message; 
        } finally { 
            this.isSending = false; 
            document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
        }
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
