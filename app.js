// 👇 버전을 secure_fix 로 변경!
import { AIEngine } from './ai-engine.js?v=secure_fix';

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
        
        // [핵심 수정] 저장소 이름을 바꿨습니다. (이전 키 무시)
        // 이제 브라우저는 저장된 키가 없다고 판단하고 무조건 물어봅니다.
        const STORAGE_KEY = 'gemini_key_new_v1'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        // 키가 없으면 입력창을 띄웁니다.
        if (!savedKey) {
            // 안내 문구를 더 명확하게 수정
            savedKey = prompt("📢 [필수] 구글 AI Studio에서 발급받은 '새 API 키'를 붙여넣어 주세요:\n(이 키는 서버에 전송되지 않고 선생님 PC에만 저장됩니다)");
            
            if (savedKey && savedKey.trim().length > 10) {
                // 입력받은 키를 저장합니다
                localStorage.setItem(STORAGE_KEY, savedKey.trim());
            } else {
                alert("⚠️ 키가 입력되지 않았습니다. 화면을 새로고침(F5)하여 다시 입력해주세요.");
                return;
            }
        }

        // 입력받은 키로 AI 엔진을 시작합니다.
        this.ai = new AIEngine(savedKey);

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
                this.loadingText.innerText = `AI 비서 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 이제 준비되었습니다. 질문을 입력해주세요!');
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
