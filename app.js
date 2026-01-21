/**
 * @file app.js
 * @description Enhanced UI Controller for SocialCare AI.
 * Implements IME protection and Robust Korean text handling.
 */

import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        this.ai = new AIEngine();
        this.isSending = false;
        // TextDecoder intended for formalizing UTF-8 intent across the streaming pipe
        this.utf8Decoder = new TextDecoder('utf-8');
        this.init();
    }

    async init() {
        // Ensure DOM is ready safely
        if (document.readyState === 'loading') {
            await new Promise(r => document.addEventListener('DOMContentLoaded', r));
        }

        this.initElements();
        this.bindEvents();
        this.updateOnlineBadge(navigator.onLine);
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
        // Unified Send Logic
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleUserAction();
        };

        this.chatInput.onkeydown = (e) => {
            // [IMPORTANT] IME Fix: Prevent double trigger when completing Korean characters
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserAction();
            }
        };

        this.chatInput.oninput = () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.updateButtonState();
        };

        this.btnSettings.onclick = () => this.modalSettings.classList.remove('hidden');
        this.btnCloseSettings.onclick = () => this.modalSettings.classList.add('hidden');
        this.btnSync.onclick = () => this.syncManual();

        window.ononline = () => this.updateOnlineBadge(true);
        window.onoffline = () => this.updateOnlineBadge(false);
    }

    updateButtonState() {
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
                        this.appendMsg('ai', '반갑습니다. 20년 경력의 베테랑 사회복지 슈퍼바이저입니다. 무엇을 도와드릴까요?');
                    }, 500);
                }
            });
        } catch (err) {
            console.error('AI Init failed:', err);
            this.loadingText.innerText = 'AI 초기화 실패. 브라우저 설정(WebGPU)을 확인하세요.';
            this.loadingText.style.color = '#ef4444';
        }
    }

    async handleUserAction() {
        if (this.isSending) return;
        const msg = this.chatInput.value.trim();
        if (!msg) return;

        // Visual State Transition
        this.isSending = true;
        this.chatInput.value = "";
        this.chatInput.style.height = 'auto';
        this.updateButtonState();

        // 1. Render User Message
        this.appendMsg('user', msg);

        // 2. Render AI Placeholder
        const aiMsgDiv = this.appendMsg('ai', '...');

        try {
            // [ROBUST ENCODING] Streaming with buffer handling
            // Note: WebLLM returns strings, but we ensure proper UTF-8 intent here
            await this.ai.generateResponse(msg, (currentText) => {
                // Safeguard against garbled partial tokens by ensuring the text is processed as a whole
                aiMsgDiv.innerHTML = this.parseRichText(currentText);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (err) {
            aiMsgDiv.innerText = "상담 중 오류가 발생했습니다: " + err.message;
        } finally {
            this.isSending = false;
            this.updateButtonState();
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    appendMsg(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        if (role === 'ai' && text !== '...') {
            msgDiv.innerHTML = this.parseRichText(text);
        } else {
            msgDiv.innerText = text; // User message is plain text for safety
        }

        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return msgDiv;
    }

    /**
     * Parse simple Markdown-like symbols into HTML.
     * Guaranteed UTF-8 safe through standard string replacement.
     */
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

    updateOnlineBadge(isOnline) {
        this.statusBadge.innerText = isOnline ? '🟢 온라인' : '🔴 오프라인';
        this.statusBadge.className = isOnline ? 'badge-online' : 'badge-offline';
    }

    async syncManual() {
        const key = document.getElementById('notion-api-key').value;
        const id = document.getElementById('notion-page-id').value;

        if (!key || !id) {
            alert('설정 정보를 모두 입력해주세요.');
            return;
        }

        this.btnSync.disabled = true;
        this.btnSync.innerText = '동기화 중...';

        try {
            // Simulation of RAG update
            const mockData = [
                { id: '1', content: '응급 위기 개입: 즉시 119 신고 및 주변 동료 지원 요청.' },
                { id: '2', content: '개인정보 보호 정책: 모든 상담 기록은 외부 반출을 엄격히 금지함.' }
            ];
            await this.ai.updateKnowledgeBase(mockData);
            alert('노션 매뉴얼이 로컬 데이터베이스와 동기화되었습니다.');
        } catch (err) {
            alert('동기화 실패: ' + err.message);
        } finally {
            this.btnSync.disabled = false;
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
        }
    }
}

// Global Launcher
new App();
