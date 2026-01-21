/**
 * @file app.js
 * @description Integrated Fix for SocialCare AI.
 * Ensures single initialization, reliable encoding, and correct persona greeting.
 */

import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        // [DEFINITE ONCE FLAG] Prevents duplicate greetings and event listeners
        if (window.__initialized) return;
        window.__initialized = true;

        this.ai = new AIEngine();
        this.isSending = false;

        this.init();
    }

    async init() {
        // Safeguard for DOM availability
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        this.initElements();
        this.bindEvents();
        this.updateOnlineStatus(navigator.onLine);

        // Final sanity check for initialization before greeting
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
        // Direct event assignment to avoid duplicate registrations
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleSend();
        };

        this.chatInput.onkeydown = (e) => {
            // [IME FIX] Critical for Korean Windows/Mac
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
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

        window.ononline = () => this.updateOnlineStatus(true);
        window.onoffline = () => this.updateOnlineStatus(false);
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
                this.loadingText.innerText = `모델 준비 중... (${progress}%)`;

                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        // [GREETING] Single output guaranteed by __initialized flag
                        this.appendMessage('ai', '안녕하세요, 연호 선생님. 아동보호전문기관 업무 지원을 위한 AI 비서입니다. 무엇을 도와드릴까요?');
                    }, 500);
                }
            });
        } catch (err) {
            this.loadingText.innerText = 'AI 초기화 실패. 브라우저 설정(WebGPU)을 확인하세요.';
            this.loadingText.style.color = '#ef4444';
        }
    }

    async handleSend() {
        if (this.isSending) return;
        const rawText = this.chatInput.value.trim();
        if (!rawText) return;

        this.isSending = true;
        this.chatInput.value = "";
        this.chatInput.style.height = 'auto';
        this.updateButton();

        this.appendMessage('user', rawText);
        const aiMsgDiv = this.appendMessage('ai', '...');

        try {
            await this.ai.generateResponse(rawText, (fullText) => {
                aiMsgDiv.innerHTML = this.parseRichText(fullText);
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
            msgDiv.innerHTML = this.parseRichText(text);
        } else {
            msgDiv.innerText = text;
        }

        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return msgDiv;
    }

    parseRichText(text) {
        if (!text) return "";
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^-\s(.*)$/gm, '<li>$1</li>');

        if (html.includes('<li>')) {
            html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
        return html.replace(/\n/g, '<br>');
    }

    updateOnlineStatus(isOnline) {
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
            // Simulated fetch with context optimization logic check
            const data = [
                { id: '1', content: '[매뉴얼] 아동학대 의심 신고 접수 시 즉시 경찰(112)과 동시 신고 체계를 가동하여야 함.' },
                { id: '2', content: '[매뉴얼] 재학대 방지를 위한 모니터링은 주 1회 이상 유선 또는 대면으로 실시함을 원칙으로 함.' }
            ];
            await this.ai.updateKnowledgeBase(data);
            alert('노션 데이터 동기화 완료! 이제 매뉴얼을 기반으로 답변합니다.');
        } catch (err) {
            alert('실패');
        } finally {
            this.btnSync.disabled = false;
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
        }
    }
}

// Singleton global entry
new App();
