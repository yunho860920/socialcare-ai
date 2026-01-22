// 👇 버전을 REBOOT 로 변경 (캐시 완전 무시)
import { AIEngine } from './ai-engine.js?v=REBOOT';

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
        
        // [정밀 해결] 저장소 키를 바꿔서, 과거의 차단된 키 기록을 강제로 버립니다.
        const STORAGE_ID = 'GEMINI_API_KEY_REBOOT_V1'; 
        let savedKey = localStorage.getItem(STORAGE_ID);
        
        // 키가 없으면 무조건 물어봅니다.
        if (!savedKey) {
            savedKey = prompt("📢 [시스템 초기화] 구글 AI Studio에서 발급받은 '새 API 키'를 입력하세요.\n(주의: 절대 코드 파일 안에 키를 적지 마세요!)");
            
            if (savedKey && savedKey.trim().length > 20) {
                localStorage.setItem(STORAGE_ID, savedKey.trim());
            } else {
                alert("API 키가 없으면 작동하지 않습니다. F5를 눌러 다시 시도하세요.");
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
                this.loadingText.innerText = `시스템 재설정 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '시스템이 초기화되었습니다. manual.txt 내용을 질문해주세요.');
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
        const aiMsg = this.appendMessage('ai', '분석 중...');
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
