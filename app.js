// 👇 버전을 last_dance 로 변경
import { AIEngine } from './ai-engine.js?v=last_dance';

class App {
    constructor() {
        this.isSending = false;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        // [중요] 저장소 키를 완전히 바꿔서, 무조건 새 키를 입력받게 합니다.
        const STORAGE_KEY = 'GEMINI_REAL_FINAL_KEY'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            // 화면이 뜨자마자 입력창 실행
            setTimeout(() => {
                savedKey = prompt("🔑 [최종] 구글 API 키를 입력하세요:\n(이전에 안 되던 키 말고, 새로 받은 키를 넣어주세요)");
                if (savedKey && savedKey.trim().length > 10) {
                    localStorage.setItem(STORAGE_KEY, savedKey.trim());
                    // 키 입력 후 새로고침하여 깔끔하게 시작
                    location.reload();
                } else {
                    alert("키를 입력해야 합니다.");
                }
            }, 500);
        } else {
            // 저장된 키가 있으면 시작
            this.ai = new AIEngine(savedKey);
            this.startAI();
        }

        this.updateOnlineStatus(true);
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
        if (this.btnSend) {
            this.btnSend.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSend();
            });
            this.btnSend.style.cursor = 'pointer';
        }
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
        if (!this.ai) return;
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `기본 모델 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 가장 튼튼한 기본 모델(Gemini Pro)로 연결했습니다. 이제 대화가 될 겁니다!');
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
        } catch (e) { 
            aiMsg.innerText = "오류: " + e.message; 
        } finally { 
            this.isSending = false; 
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
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
