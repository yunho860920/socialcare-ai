/**
 * app.js - 버튼 및 엔진 연결 보장 버전
 */
class App {
    constructor() {
        this.isSending = false;
        // 엔진 파일이 로드될 때까지 잠시 대기 후 시작
        window.onload = () => this.init();
    }

    async init() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.btnSend = document.getElementById('btn-send');
        this.statusBadge = document.getElementById('status-badge');

        const STORAGE_ID = 'SOCIAL_CARE_FINAL_KEY_PRO';
        let savedKey = localStorage.getItem(STORAGE_ID);

        if (!savedKey) {
            savedKey = prompt("🔑 새 프로젝트에서 만든 API 키를 입력하세요:");
            if (savedKey) localStorage.setItem(STORAGE_ID, savedKey.trim());
        }

        if (window.AIEngine) {
            this.ai = new window.AIEngine(savedKey);
            await this.ai.initialize();
            if (this.statusBadge) {
                this.statusBadge.innerText = '🟢 온라인';
                this.statusBadge.style.color = '#10b981';
            }
            this.bindEvents();
        } else {
            alert("시스템 로딩 오류. 새로고침(F5) 해주세요.");
        }
    }

    bindEvents() {
        // 전송 버튼 강제 활성화
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleSend();
        };
        this.chatInput.onkeydown = (e) => {
            if (e.key === 'Enter') this.handleSend();
        };
    }

    async handleSend() {
        if (this.isSending) return;
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.isSending = true;
        this.chatInput.value = "";
        this.appendMessage('user', text);
        const aiMsg = this.appendMessage('ai', '답변 생성 중...');

        try {
            await this.ai.generateResponse(text, (chunk) => {
                aiMsg.innerText = chunk;
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (e) {
            aiMsg.innerText = "❌ 오류: " + e.message;
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
