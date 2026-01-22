// 👇 버전을 victory_final 로 변경
import { AIEngine } from './ai-engine.js?v=victory_final';

class App {
    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        // [핵심] 저장소 이름을 바꿔서, 아까 입력한 틀린 키를 무시하고 다시 물어봅니다.
        const STORAGE_KEY = 'GEMINI_VICTORY_KEY_V2'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            // 화면 로딩 직후 입력창 띄우기
            setTimeout(() => {
                savedKey = prompt("🔑 [최종] 방금 '+ 새 프로젝트 만들기'로 받은 키를 입력하세요:");
                if (savedKey && savedKey.trim().length > 10) {
                    localStorage.setItem(STORAGE_KEY, savedKey.trim());
                    location.reload(); 
                } else {
                    alert("키를 입력해야 시작됩니다.");
                }
            }, 500);
        } else {
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
                this.loadingText.innerText = `최종 연결... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '새 프로젝트 연결 성공! 이제 정말 됩니다.');
                    }, 500);
                }
            });
        } catch (e) { this.loadingText.innerText = '준비 실패'; }
    }

    async handleSend() {
        const text = this.chatInput.value.trim();
        if (!text) return;
        this.chatInput.value = "";
        this.appendMessage('user', text);
        const aiMsg = this.appendMessage('ai', '...');
        try {
            await this.ai.generateResponse(text, (chunk) => aiMsg.innerText = chunk);
        } catch (e) { 
            aiMsg.innerText = "오류: " + e.message; 
        } finally {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerText = text;
        this.chatMessages.appendChild(div);
        return div;
    }
}
new App();
