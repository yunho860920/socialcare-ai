// 👇 버전을 online_fix 로 변경
import { AIEngine } from './ai-engine.js?v=online_fix';

class App {
    constructor() {
        this.isSending = false;
        // 페이지 로드 즉시 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        const STORAGE_KEY = 'gemini_sdk_direct_key'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            setTimeout(() => {
                savedKey = prompt("🔑 [복구 모드] API 키를 입력해주세요:");
                if (savedKey && savedKey.trim().length > 10) {
                    localStorage.setItem(STORAGE_KEY, savedKey.trim());
                    // 키 저장 후 페이지 새로고침 (확실한 로딩을 위해)
                    location.reload(); 
                } else {
                    alert("키가 필요합니다.");
                }
            }, 500);
        } else {
            this.ai = new AIEngine(savedKey);
            this.startAI();
        }

        // JS가 정상 로드되면 온라인으로 바뀝니다.
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
                this.loadingText.innerText = `라이브러리 로딩 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 구글 SDK가 정상적으로 로드되었습니다. 이제 됩니다!');
                    }, 500);
                }
            });
        } catch (e) { this.loadingText.innerText = '로딩 실패'; }
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
