/**
 * @file app.js
 * @description Main application controller for SocialCare AI Chatbot.
 * Handles UI, Privacy filtering, and event coordination.
 * Enforces UTF-8 encoding and robust event handling to prevent duplicate messages (IME).
 */

import { AIEngine } from './ai-engine.js';

/**
 * PII Filter: Masks Resident Registration Numbers and Phone Numbers.
 * Ensures data stays private on the local machine.
 */
function maskPII(text) {
    if (!text) return "";
    let masked = text;
    // Resident Registration Number (RRN)
    masked = masked.replace(/\d{6}-\d{7}/g, 'RRN_MASKED');
    // Phone Number (Mobile/Fixed)
    masked = masked.replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, 'PHONE_MASKED');
    return masked;
}

class App {
    constructor() {
        this.ai = new AIEngine();
        this.isSending = false;

        // Wait for DOM to be fully ready before initializing UI
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.initElements();
        this.bindEvents();
        this.updateOnlineStatus(navigator.onLine);
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
        // Use addEventListener with a single execution mindset
        this.btnSend.addEventListener('click', () => this.handleSendMessage());

        this.chatInput.addEventListener('keydown', (e) => {
            // CRITICAL: Prevent duplicate execution during Korean IME composition
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // Dynamic height for textarea
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.updateButtonStates();
        });

        this.btnSettings.addEventListener('click', () => this.modalSettings.classList.remove('hidden'));
        this.btnCloseSettings.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
        this.btnSync.addEventListener('click', () => this.syncNotion());

        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
    }

    updateButtonStates() {
        const hasContent = this.chatInput.value.trim().length > 0;
        this.btnSend.disabled = !hasContent || this.isSending;
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
            console.error('AI Init failed:', error);
            this.loadingText.innerText = 'AI 로드 실패: WebGPU 또는 네트워크 상태를 확인하세요.';
            this.loadingText.style.color = '#ef4444';
        }
    }

    async handleSendMessage() {
        // 1. Guard against duplicate calls or empty input
        if (this.isSending) return;
        const text = this.chatInput.value.trim();
        if (!text) return;

        // 2. Immediate State Lock & UI Clear
        this.isSending = true;
        this.chatInput.value = "";
        this.chatInput.style.height = 'auto';
        this.updateButtonStates();

        // 3. Process & Display User Message
        const processedText = maskPII(text);
        this.appendMessage('user', processedText);

        // 4. Generate AI Response
        const aiMsgDiv = this.appendMessage('ai', '...');
        try {
            const response = await this.ai.generateResponse(processedText);
            aiMsgDiv.innerText = ""; // Clear loader
            aiMsgDiv.innerHTML = this.parseMarkdown(response);
        } catch (error) {
            aiMsgDiv.innerText = "오류 발생: " + error.message;
        } finally {
            // 5. Release Lock
            this.isSending = false;
            this.updateButtonStates();
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

    updateOnlineStatus(isOnline) {
        if (isOnline) {
            this.statusBadge.innerText = '🟢 온라인';
            this.statusBadge.className = 'badge-online';
        } else {
            this.statusBadge.innerText = '🔴 오프라인';
            this.statusBadge.className = 'badge-offline';
        }
    }

    async syncNotion() {
        const apiKey = document.getElementById('notion-api-key').value;
        const pageId = document.getElementById('notion-page-id').value;

        if (!apiKey || !pageId) {
            alert('Notion API Key와 Page ID를 입력해주세요.');
            return;
        }

        this.btnSync.innerText = '동기화 중...';
        this.btnSync.disabled = true;

        try {
            const data = await this.fetchNotionData(apiKey, pageId);
            await this.ai.updateKnowledgeBase(data);
            alert('매뉴얼 동기화가 완료되었습니다.');
        } catch (error) {
            alert('동기화 실패: ' + error.message);
        } finally {
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
            this.btnSync.disabled = false;
        }
    }

    async fetchNotionData(apiKey, pageId) {
        // Simulation of fetching (Browser requires proxy for CORS)
        return [
            { id: '1', content: '응급 노인 복지 매뉴얼: 위급 상황 시 119 신고' },
            { id: '2', content: '개인정보 보호: 비식별화 처리 필수' }
        ];
    }
}

// Single instance initialization
new App();

// Service Worker (Optional but recommended for Full PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .catch(err => console.warn('Offline mode setup skipped or failed:', err));
    });
}
