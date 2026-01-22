// 👇 버전을 v_perfect 로 변경하여 캐시를 완전히 새로고침합니다.
import { AIEngine } from './ai-engine.js?v=v_perfect';

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
        
        // [핵심] 완전히 새로운 저장소 이름 사용 (이전 에러 기록 삭제)
        const FINAL_STORAGE_KEY = 'gemini_final_key_v100'; 
        let savedKey = localStorage.getItem(FINAL_STORAGE_KEY);
        
        if (!savedKey) {
            savedKey = prompt("📢 [마지막 단계] 구글 AI Studio에서 발급받은 '새 API 키'를 입력해주세요.\n(이 키는 선생님 브라우저에만 안전하게 저장됩니다)");
            if (savedKey && savedKey.trim().length > 10) {
                localStorage.setItem(FINAL_STORAGE_KEY, savedKey.trim());
            } else {
                alert("키를 입력해야 시작할 수 있습니다. 새로고침(F5) 해주세요.");
                return;
            }
        }

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
        this.btnSend.onclick = (e) => { e.preventDefault(); this.handleSend(); };
        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
        };
    }

    updateOnlineStatus(isOnline) {
        if (this.statusBadge) {
            this.statusBadge.innerText = isOnline ? '🟢 온라인' : '🔴 오프라인';
            this.statusBadge.style.color = isOnline ? '#10b981' : '#ef4444';
        }
    }

    async startAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `최종 세팅 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요, 연호 선생님! 이제 모든 설정이 완료되었습니다. manual.txt를 바탕으로 무엇이든 물어보세요.');
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
        const aiMsg = this.appendMessage('ai', '지침 확인 중...');
        try {
            await this.ai.generateResponse(text, (chunk) => aiMsg.innerText = chunk);
        } catch (e) { aiMsg.innerText = "오류: " + e.message; }
        finally { this.isSending = false; }
    }

    appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerText = text;
        this.chatMessages.appendChild(div);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return div;
    }
}
new App();
