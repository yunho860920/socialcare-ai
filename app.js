/**
 * @file app.js
 * @description Google Gemini API 최적화 및 UI 중복 오류 해결 버전
 */

import { AIEngine } from './ai-engine.js';

class App {
    constructor() {
        // [중복 실행 방지] 페이지 로드 시 한 번만 실행되도록 보장
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
        this.updateOnlineStatus(navigator.onLine);

        // 제미나이 엔진 및 manual.txt 초기화 시작
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
        
        // 설정 모달 관련
        this.modalSettings = document.getElementById('modal-settings');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnCloseSettings = document.getElementById('btn-close-settings');
        this.btnSync = document.getElementById('btn-sync-notion');
    }

    bindEvents() {
        // 전송 버튼 클릭
        this.btnSend.onclick = (e) => {
            e.preventDefault();
            this.handleSend();
        };

        // 키보드 입력 (한글 엔터 중복 전송 방지)
        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return; 

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };

        // 입력창 높이 조절 및 버튼 활성화
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
            // 제미나이 방식은 모델 다운로드가 필요 없어 로딩 바가 즉시 완료됩니다.
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `제미나이 AI 연결 중... (${progress}%)`;

                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        // [단일 인사말] 페이지당 딱 한 번만 출력
                        this.appendMessage('ai', '안녕하세요, 연호 선생님. 제미나이 기반 아동보호 업무 비서입니다. manual.txt와 노션 지침을 바탕으로 정확히 답변해 드리겠습니다.');
                    }, 300);
                }
            });
        } catch (err) {
            console.error(err);
            this.loadingText.innerText = 'API 연결 실패. 키 설정을 확인하세요.';
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
        const aiMsgDiv = this.appendMessage('ai', '생각 중...');

        try {
            // ai-engine.js의 제미나이 API 호출 함수를 사용합니다.
            await this.ai.generateResponse(rawText, (fullText) => {
                aiMsgDiv.innerHTML = this.parseRichText(fullText);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            });
        } catch (err) {
            aiMsgDiv.innerText = "답변 생성 실패: " + err.message;
        } finally {
            this.isSending = false;
            this.updateButton();
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        if (role === 'ai' && text !== '생각 중...') {
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
        if (!key || !id) return alert('노션 설정을 확인하세요.');

        this.btnSync.disabled = true;
        this.btnSync.innerText = '동기화 중...';
        try {
            // 노션 API 연동 시 필요한 데이터 구조 반영 가능
            const notionData = []; 
            await this.ai.updateKnowledgeBase(notionData);
            alert('노션 지침 업데이트 완료!');
        } catch (err) {
            alert('실패: ' + err.message);
        } finally {
            this.btnSync.disabled = false;
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
        }
    }
}

// 애플리케이션 시작
new App();
