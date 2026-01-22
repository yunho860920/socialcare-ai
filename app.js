/**
 * app.js - 전송 기능 강화 버전
 */
class App {
    constructor() {
        this.isSending = false;
        this.init();
    }

    async init() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.btnSend = document.getElementById('btn-send');
        this.statusBadge = document.getElementById('status-badge');

        const STORAGE_ID = 'FINAL_ULTIMATE_KEY';
        let savedKey = localStorage.getItem(STORAGE_ID);

        if (!savedKey) {
            savedKey = prompt("🔑 구글 API Studio에서 '+ 새 프로젝트 만들기'로 받은 새 키를 입력하세요:");
            if (savedKey) {
                localStorage.setItem(STORAGE_ID, savedKey.trim());
                location.reload();
            }
        } else {
            // [정밀 수정] 온라인 상태 강제 표시
            if (this.statusBadge) {
                this.statusBadge.innerText = '🟢 온라인';
                this.statusBadge.style.color = '#10b981';
            }
            this.ai = new AIEngine(savedKey);
            await this.ai.initialize(() => {});
            this.bindEvents();
        }
    }

    bindEvents() {
        // 전송 버튼 클릭 활성화
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleSend();
        };
        // 엔터키 활성화
        this.chatInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };
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
            aiMsg.innerText = "연결을 확인해주세요.";
        } finally {
            this.isSending = false;
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
