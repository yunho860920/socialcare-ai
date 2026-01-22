/**
 * app.js - 입력창 즉시 실행 및 무한 대기 버전
 */
// 👇 버전을 v_immediate 로 변경
import { AIEngine } from './ai-engine.js?v=v_immediate';

class App {
    constructor() {
        // [수정] 복잡한 초기화 방지 코드를 제거하고 바로 실행합니다.
        this.isSending = false;
        // 페이지가 다 로딩되면 바로 init을 실행합니다.
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        // [해결책 1] 키 확인 로직을 아주 단순하게 변경
        const STORAGE_KEY = 'social_care_final_key'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        // 키가 없으면, 입력할 때까지 계속 물어봅니다 (새로고침 불필요)
        while (!savedKey || savedKey.trim().length < 10) {
            savedKey = prompt("🔑 [필수] 구글 API 키를 입력해주세요.\n(입력하지 않으면 시작할 수 없습니다)");
            if (savedKey && savedKey.trim().length > 10) {
                localStorage.setItem(STORAGE_KEY, savedKey.trim());
            } else {
                alert("API 키가 필요합니다. 다시 시도해주세요.");
            }
        }

        // 입력받은 키로 엔진 시작
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
                this.loadingText.innerText = `연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 설정이 완료되었습니다. 질문을 입력해주세요.');
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
