/**
 * app.js - 전송 버튼 활성화 및 즉시 실행 버전
 */
import { AIEngine } from './ai-engine.js?v=expert_final';

class App {
    constructor() {
        this.isSending = false;
        this.init();
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        // [중요] 저장소 키를 완전히 새로 지정하여 낡은 기록을 삭제합니다.
        const KEY_ID = 'SOCIAL_CARE_MASTER_KEY_V1'; 
        let savedKey = localStorage.getItem(KEY_ID);
        
        if (!savedKey) {
            // 접속 즉시 입력창 호출
            setTimeout(() => {
                savedKey = prompt("🔑 [최종 해결] 구글 AI Studio에서 '+ 새 프로젝트 만들기'로 받은 새 키를 입력하세요:");
                if (savedKey && savedKey.trim().length > 10) {
                    localStorage.setItem(KEY_ID, savedKey.trim());
                    location.reload();
                }
            }, 300);
        } else {
            this.ai = new AIEngine(savedKey);
            this.startAI();
        }
    }

    initElements() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.btnSend = document.getElementById('btn-send');
        this.aiLoading = document.getElementById('ai-loading');
        this.progressFill = document.getElementById('progress-fill');
        this.loadingText = document.getElementById('loading-text');
    }

    bindEvents() {
        // [요청 반영] 푸른색 전송 버튼 활성화
        if (this.btnSend) {
            this.btnSend.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSend();
            });
            this.btnSend.style.cursor = 'pointer'; // 클릭 가능 표시
        }
        
        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
        };
    }

    async startAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `전문가 모드 연결 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '설정이 완료되었습니다. 무엇을 도와드릴까요?');
                    }, 500);
                }
            });
        } catch (e) { this.loadingText.innerText = '로딩 오류'; }
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
            await this.ai.generateResponse(text, (chunk) => {
                aiMsg.innerText = chunk;
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (e) { 
            aiMsg.innerText = "연결 오류가 발생했습니다. 키 권한을 확인해주세요."; 
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
