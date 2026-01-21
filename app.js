/**
 * @file app.js
 * @description Robust UI Controller for SocialCare AI.
 * Handles IME (Duplicate Input) prevention and UTF-8 safe rendering.
 */

import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        this.ai = new AIEngine();
        this.isSending = false;
        // TextDecoder for explicit UTF-8 handling (for raw buffer scenarios, but also formalizes intent)
        this.decoder = new TextDecoder('utf-8');

        // Single Entry Point
        this.init();
    }

    async init() {
        // Wait for DOM to ensure all elements are accessible
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        this.initElements();
        this.bindEvents();
        this.updateStatus(navigator.onLine);
        this.initializeAI();
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
        // Use onclick to guarantee a single handler or clear existing before addEventListener
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleSendMessage();
        };

        this.chatInput.addEventListener('keydown', (e) => {
            // [IME FIX]: Prevent duplicate execution when combining Korean characters
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.btnSend.disabled = !this.chatInput.value.trim() || this.isSending;
        });

        this.btnSettings.onclick = () => this.modalSettings.classList.remove('hidden');
        this.btnCloseSettings.onclick = () => this.modalSettings.classList.add('hidden');
        this.btnSync.onclick = () => this.syncNotion();

        window.ononline = () => this.updateStatus(true);
        window.onoffline = () => this.updateStatus(false);
    }

    async initializeAI() {
        this.aiLoading.classList.remove('hidden');
        try {
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = report.text;
                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        this.appendMessage('ai', 'AI 모델 로드가 완료되었습니다. 상담을 시작할 수 있습니다.');
                    }, 500);
                }
            });
        } catch (error) {
            this.loadingText.innerText = 'AI 초기화 실패. WebGPU 설정을 확인하세요.';
            this.loadingText.style.color = '#ef4444';
        }
    }

    async handleSendMessage() {
        if (this.isSending) return;
        const text = this.chatInput.value.trim();
        if (!text) return;

        // LOCK UI
        this.isSending = true;
        this.chatInput.value = "";
        this.chatInput.style.height = 'auto';
        this.btnSend.disabled = true;

        // Display User Message
        this.appendMessage('user', text);

        // Display AI Loader
        const aiMsgDiv = this.appendMessage('ai', '...');

        try {
            // Using streaming response for better control
            await this.ai.generateResponse(text, (currentFullText) => {
                // Update AI content as it comes in
                aiMsgDiv.innerHTML = this.parseMarkdown(currentFullText);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (error) {
            aiMsgDiv.innerText = "오류 발생: " + error.message;
        } finally {
            // UNLOCK UI
            this.isSending = false;
            this.btnSend.disabled = !this.chatInput.value.trim();
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

    /**
     * UTF-8 Safe Markdown Parser
     */
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

    async syncNotion() {
        const apiKey = document.getElementById('notion-api-key').value;
        const pageId = document.getElementById('notion-page-id').value;

        if (!apiKey || !pageId) {
            alert('필수 입력 사항을 확인하세요.');
            return;
        }

        this.btnSync.disabled = true;
        this.btnSync.innerText = '동기화 중...';

        try {
            // Simulate Notion Fetch (In production, use a CORS Proxy or Serverless Function)
            const data = [
                { id: '1', content: '응급 위기 개입: 즉시 119 신고 및 안전 확보.' },
                { id: '2', content: '개인정보 보호: 주민번호 및 민감정보 비식별화.' }
            ];
            await this.ai.updateKnowledgeBase(data);
            alert('매뉴얼 동기화 성공!');
        } catch (error) {
            alert('오류 발생: ' + error.message);
        } finally {
            this.btnSync.disabled = false;
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
        }
    }
}

// Global initialization
new App();
