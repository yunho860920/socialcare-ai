// 👇 버전을 final_secure 로 변경!
import { AIEngine } from './ai-engine.js?v=final_secure';

class App {
    constructor() {
        if (window.__initialized) return;
        window.__initialized = true;
        // 엔진 생성은 init() 내부로 미룹니다.
        this.isSending = false;
        this.init();
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        // [핵심] 브라우저에 저장된 키가 있는지 확인합니다.
        let savedKey = localStorage.getItem('social_ai_key');
        
        // 키가 없으면 입력창을 띄웁니다.
        if (!savedKey || savedKey.startsWith('YOUR_')) {
            savedKey = prompt("구글 AI Studio에서 발급받은 API 키를 입력해주세요:\n(이 키는 선생님 브라우저에만 저장됩니다)");
            if (savedKey) {
                // 입력받은 키를 저장합니다 (다음번엔 안 물어봄)
                localStorage.setItem('social_ai_key', savedKey.trim());
            } else {
                alert("API 키를 입력하지 않으면 사용할 수 없습니다. 새로고침 해주세요.");
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
                this.loadingText.innerText = `보안 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 보안 키가 적용된 나만의 AI 비서입니다. 무엇을 도와드릴까요?');
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
