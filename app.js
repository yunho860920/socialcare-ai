/**
 * @file app.js
 * @description Enhanced UI Controller with CPS Persona and Duplication Guard.
 */

import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        // [SINGLETON GUARD] Ensure initialization happens only once
        if (window.SocialCareAppInstance) return window.SocialCareAppInstance;
        window.SocialCareAppInstance = this;

        this.ai = new AIEngine();
        this.isSending = false;
        this.isInitialized = false; // Internal flag for double-check

        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(r => document.addEventListener('DOMContentLoaded', r));
        }

        this.initElements();
        this.bindEvents();
        this.updateStatus(navigator.onLine);

        // Mark as initialized before starting AI to prevent multiple greetings
        this.isInitialized = true;
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
        this.modalSettings = document.getElementById('modal-settings');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnCloseSettings = document.getElementById('btn-close-settings');
        this.btnSync = document.getElementById('btn-sync-notion');
    }

    bindEvents() {
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.processInput();
        };

        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.processInput();
            }
        };

        this.chatInput.oninput = () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.updateButton();
        };

        this.btnSettings.onclick = () => this.modalSettings.classList.remove('hidden');
        this.btnCloseSettings.onclick = () => this.modalSettings.classList.add('hidden');
        this.btnSync.onclick = () => this.syncManual();

        window.ononline = () => this.updateStatus(true);
        window.onoffline = () => this.updateStatus(false);
    }

    updateButton() {
        const hasText = this.chatInput.value.trim().length > 0;
        this.btnSend.disabled = !hasText || this.isSending;
    }

    async startAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `${report.text} (${progress}%)`;

                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        // [NEW GREETING] Updated for CPS Assistant Persona
                        this.appendMessage('ai', '안녕하세요, 연호 선생님. 아동보호전문기관 업무 지원을 위한 AI 비서입니다. 무엇을 도와드릴까요?');
                    }, 500);
                }
            });
        } catch (err) {
            this.loadingText.innerText = 'AI 초기화 실패. WebGPU 설정을 확인하세요.';
            this.loadingText.style.color = '#ef4444';
        }
    }

    async processInput() {
        if (this.isSending) return;
        const text = this.chatInput.value.trim();
        if (!text) return;

        this.isSending = true;
        this.chatInput.value = "";
        this.chatInput.style.height = 'auto';
        this.updateButton();

        this.appendMessage('user', text);
        const aiMsgDiv = this.appendMessage('ai', '...');

        try {
            await this.ai.generateResponse(text, (currentText) => {
                aiMsgDiv.innerHTML = this.parseMarkdown(currentText);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (err) {
            aiMsgDiv.innerText = "오류 발생: " + err.message;
        } finally {
            this.isSending = false;
            this.updateButton();
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        if (role === 'ai' && text !== '...') {
            msgDiv.innerHTML = this.parseMarkdown(text);
        } else {
            msgDiv.innerText = text;
        }

        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return msgDiv;
    }

    parseMarkdown(text) {
        if (!text) return "";
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^-\s(.*)$/gm, '<li>$1</li>');

        if (html.includes('<li>')) {
            html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
        return html.replace(/\n/g, '<br>');
    }

    updateStatus(isOnline) {
        this.statusBadge.innerText = isOnline ? '🟢 온라인' : '🔴 오프라인';
        this.statusBadge.className = isOnline ? 'badge-online' : 'badge-offline';
    }

    async syncManual() {
        const key = document.getElementById('notion-api-key').value;
        const id = document.getElementById('notion-page-id').value;
        if (!key || !id) return alert('설정 필수!');

        this.btnSync.disabled = true;
        this.btnSync.innerText = '동기화 중...';
        try {
            const mock = [{ id: '1', content: '응급 신고 시 즉시 현장 출동.' }];
            await this.ai.updateKnowledgeBase(mock);
            alert('동기화 완료!');
        } catch (err) {
            alert('실패');
        } finally {
            this.btnSync.disabled = false;
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
        }
    }
}

// Global initialization with singleton safety
new App();
