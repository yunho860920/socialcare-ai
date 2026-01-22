// 👇 버전을 safe_mode 로 변경!
import { AIEngine } from './ai-engine.js?v=safe_mode';

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
        
        // 키 저장소 이름을 바꿔서 새로 입력받게 합니다.
        const STORAGE_KEY = 'gemini_safe_key_v1'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            savedKey = prompt("🔑 [안전 모드] 구글 AI Studio에서 받은 '새 API 키'를 입력하세요:");
            if (savedKey && savedKey.trim().length > 10) {
                localStorage.setItem(STORAGE_KEY, savedKey.trim());
            } else {
                alert("키가 없으면 작동하지 않습니다. 새로고침 해주세요.");
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
                this.loadingText.innerText = `안전 모드 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', 'Gemini Pro(안전 모드)가 준비되었습니다. 이제 질문해 주세요.');
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
        
        // 메시지 박스를 미리 만들고
        const aiMsg = this.appendMessage('ai', '생각 중...');
        
        try {
            // 결과가 오면 텍스트를 교체합니다.
            await this.ai.generateResponse(text, (chunk) => aiMsg.innerText = chunk);
        } catch (e) { 
            aiMsg.innerText = "오류: " + e.message; 
        } finally { 
            this.isSending = false; 
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
