/**
 * @file app.js
 * @description Robust UI Controller for SocialCare AI.
 * Focus: Preventing duplication via strict global singleton and persona alignment.
 */

import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        // [DEFINITIVE DUPLICATION GUARD]
        if (window.__SocialCareApp_Initialized__) {
            console.warn("App already initialized. Preventing duplicate instance.");
            return;
        }
        window.__SocialCareApp_Initialized__ = true;

        this.ai = new AIEngine();
        this.isSending = false;

        this.init();
    }

    async init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(r => document.addEventListener('DOMContentLoaded', r));
        }

        this.initElements();
        this.bindEvents();
        this.updateOnlineBadge(navigator.onLine);

        // Start AI Initialization (only called once)
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
        // Direct assignment to prevent multiple listener registration
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleSend();
        };

        this.chatInput.onkeydown = (e) => {
            // [IME FIX]
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };

        this.chatInput.oninput = () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.updateBtn();
        };

        this.btnSettings.onclick = () => this.modalSettings.classList.remove('hidden');
        this.btnCloseSettings.onclick = () => this.modalSettings.classList.add('hidden');
        this.btnSync.onclick = () => this.syncNotion();

        window.ononline = () => this.updateOnlineBadge(true);
        window.onoffline = () => this.updateOnlineBadge(false);
    }

    updateBtn() {
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
                        // [GREETING] Single output guaranteed by constructor flag
                        this.appendMessage('ai', '안녕하세요, 연호 선생님. 아동보호전문기관 업무 지원을 위한 AI 비서입니다. 무엇을 도와드릴까요?');
                    }, 500);
                }
            });
        } catch (err) {
            this.loadingText.innerText = 'AI 초기화 실패. WebGPU 설정을 확인하세요.';
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
        this.updateBtn();

        this.appendMessage('user', rawText);
        const aiMsgDiv = this.appendMessage('ai', '...');

        try {
            await this.ai.generateResponse(rawText, (fullText) => {
                aiMsgDiv.innerHTML = this.parseMarkdown(fullText);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (err) {
            aiMsgDiv.innerText = "오류 발생: " + err.message;
        } finally {
            this.isSending = false;
            this.updateBtn();
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

    updateOnlineBadge(isOnline) {
        this.statusBadge.innerText = isOnline ? '🟢 온라인' : '🔴 오프라인';
        this.statusBadge.className = isOnline ? 'badge-online' : 'badge-offline';
    }

    async syncNotion() {
        const key = document.getElementById('notion-api-key').value;
        const id = document.getElementById('notion-page-id').value;
        if (!key || !id) return alert('필수 입력 사항 확인!');

        this.btnSync.innerText = '동기화 중...';
        this.btnSync.disabled = true;

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
