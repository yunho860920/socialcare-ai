// 👇 버전을 v_final_one으로 변경하여 브라우저가 새 코드를 강제로 읽게 합니다.
import { AIEngine } from './ai-engine.js?v=v_final_one';

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
        
        // [핵심] 새로운 저장소 키를 사용하여 이전의 잘못된 키 기록을 무시합니다.
        const STORAGE_KEY = 'gemini_absolute_final_v1'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            savedKey = prompt("📢 [마지막 단계] 구글 AI Studio에서 발급받은 '새 API 키'를 입력해주세요.\n(이 키는 선생님 브라우저에만 안전하게 저장됩니다)");
            if (savedKey && savedKey.trim().length > 10) {
                localStorage.setItem(STORAGE_KEY, savedKey.trim());
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
                this.loadingText.innerText = `서버 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '반갑습니다, 연호 선생님! 모든 설정이 완료되었습니다. 이제 manual.txt 지침에 대해 질문해 주세요.');
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
        const aiMsg = this.appendMessage('ai', '매뉴얼 확인 중...');
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
