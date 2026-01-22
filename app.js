// 👇 버전을 final_stable 로 변경!
import { AIEngine } from './ai-engine.js?v=final_stable';

class App {
    constructor() {
        if (window.__initialized) return;
        window.__initialized = true;
        this.isSending = false;
        this.init();
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        // [변경] 저장소 이름을 바꿔서 키를 다시 물어보게 만듭니다.
        const STORAGE_KEY = 'gemini_key_stable_v1'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            savedKey = prompt("🔑 [최종 단계] API 키를 입력해주세요:\n(이전에 쓰던 키를 그대로 넣으셔도 됩니다)");
            if (savedKey && savedKey.trim().length > 10) {
                localStorage.setItem(STORAGE_KEY, savedKey.trim());
            } else {
                alert("키를 입력해야 시작할 수 있습니다. 새로고침 해주세요.");
                return;
            }
        }

        this.ai = new AIEngine(savedKey);
        this.updateOnlineStatus(true);
        this.startAI();
    }
    
    // ... (이 아래 코드는 기존과 완벽히 동일합니다) ...
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
                this.loadingText.innerText = `표준 모델 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 1.5 Flash 표준 모델이 준비되었습니다. 이제 정말 끊기지 않을 거예요!');
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
        document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
        return div;
    }
}
new App();
