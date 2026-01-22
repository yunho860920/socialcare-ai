// 👇 버전을 v_button_fix 로 변경
import { AIEngine } from './ai-engine.js?v=v_button_fix';

class App {
    constructor() {
        this.isSending = false;
        // 페이지 로드 즉시 실행 보장
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        this.initElements();
        this.bindEvents();
        
        const STORAGE_KEY = 'gemini_final_key_auto'; 
        let savedKey = localStorage.getItem(STORAGE_KEY);
        
        if (!savedKey) {
            setTimeout(() => {
                savedKey = prompt("🔑 구글 API 키를 입력하세요 (전송 버튼 활성화 버전):");
                if (savedKey && savedKey.trim().length > 10) {
                    localStorage.setItem(STORAGE_KEY, savedKey.trim());
                    this.ai = new AIEngine(savedKey);
                    this.startAI();
                } else {
                    alert("키 입력이 필요합니다.");
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
        
        // [중요] 전송 버튼을 확실하게 찾습니다.
        this.btnSend = document.getElementById('btn-send');
        
        this.statusBadge = document.getElementById('status-badge');
        this.aiLoading = document.getElementById('ai-loading');
        this.progressFill = document.getElementById('progress-fill');
        this.loadingText = document.getElementById('loading-text');
    }

    bindEvents() {
        // [핵심] 버튼 클릭 이벤트를 'onclick' 대신 'addEventListener'로 강력하게 부착
        if (this.btnSend) {
            this.btnSend.addEventListener('click', (e) => {
                e.preventDefault(); // 페이지 새로고침 방지
                console.log("🖱️ 전송 버튼 클릭됨!"); // 클릭 확인용 로그
                this.handleSend();
            });
            
            // 마우스 커서를 손가락 모양으로 강제 변경 (CSS가 안 먹혀있을 경우 대비)
            this.btnSend.style.cursor = 'pointer';
        } else {
            console.error("⛔ 'btn-send' 아이디를 가진 버튼을 찾을 수 없습니다. HTML을 확인해주세요.");
        }

        // 엔터키 입력 시 전송
        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                this.handleSend(); 
            }
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
                this.loadingText.innerText = `AI 준비 중... (${progress}%)`;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요. 버튼이 활성화되었습니다. 질문을 입력하고 파란 버튼을 눌러보세요.');
                    }, 500);
                }
            });
        } catch (e) { this.loadingText.innerText = '초기화 실패'; }
    }

    async handleSend() {
        // 전송 중이면 중복 클릭 방지 (하지만 에러나면 풀리게 설정)
        if (this.isSending) return;
        
        const text = this.chatInput.value.trim();
        if (!text) {
            alert("내용을 입력해주세요!"); // 빈 내용일 때 알림
            return;
        }

        this.isSending = true;
        this.chatInput.value = ""; // 입력창 비우기
        this.appendMessage('user', text);
        
        const aiMsg = this.appendMessage('ai', '답변 작성 중...');
        
        try {
            await this.ai.generateResponse(text, (chunk) => aiMsg.innerText = chunk);
        } catch (e) { 
            aiMsg.innerText = "오류: " + e.message; 
        } finally { 
            this.isSending = false; // [중요] 전송이 끝나면 버튼 잠금 해제
            // 채팅창 스크롤 맨 아래로
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
