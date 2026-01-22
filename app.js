// 👇 버전을 v_victory 로 변경
import { AIEngine } from './ai-engine.js?v=v_victory';

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
        
        // 저장소 키 변경 -> 강제로 입력창 띄움
        const STORAGE_KEY = 'GEMINI_VICTORY_KEY'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            setTimeout(() => {
                // 안내 문구 강화
                savedKey = prompt("🔑 [진짜 마지막] 방금 '새 프로젝트'에서 만든 키를 입력하세요:");
                if (savedKey && savedKey.trim().length > 10) {
                    localStorage.setItem(STORAGE_KEY, savedKey.trim());
                    location.reload(); // 깔끔하게 새로고침
                } else {
                    alert("키를 입력해주세요.");
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
                this.loadingText.innerText = `최종 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 모든 준비가 끝났습니다. 질문해 보세요!');
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
