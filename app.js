/**
 * @file app.js
 * @description 제미나이 API 연동 및 UI 최적화 버전
 */

import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        if (window.__initialized) return;
        window.__initialized = true;

        this.ai = new AIEngine();
        this.isSending = false;
        this.init();
    }

    async init() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        this.initElements();
        this.bindEvents();
        
        // 제미나이 엔진 초기화 (여기서 manual.txt를 읽고 콘솔 로그를 남깁니다)
        this.startAI();
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
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleSend();
        };

        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };
    }

    async startAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            // ai-engine.js의 initialize를 호출하여 파일을 읽습니다.
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `제미나이 AI 연결 중... (${progress}%)`;

                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', '안녕하세요, 연호 선생님. 제미나이 기반 업무 비서가 준비되었습니다. manual.txt 내용을 바탕으로 지침을 안내해 드릴게요.');
                    }, 500);
                }
            });
        } catch (err) {
            this.loadingText.innerText = '초기화 실패. API 키 또는 네트워크를 확인하세요.';
        }
    }

    async handleSend() {
        if (this.isSending) return;
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.isSending = true;
        this.chatInput.value = "";
        this.appendMessage('user', text);
        const aiMsgDiv = this.appendMessage('ai', '지침 확인 중...');

        try {
            const response = await this.ai.generateResponse(text, (fullText) => {
                aiMsgDiv.innerText = fullText;
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (err) {
            aiMsgDiv.innerText = "오류 발생: " + err.message;
        } finally {
            this.isSending = false;
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.innerText = text;
        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return msgDiv;
    }
}

new App();
