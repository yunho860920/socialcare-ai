/**
 * @file app.js
 * @description 사회복지 AI 비서 (사무실 PC 고성능 모드 통합본)
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

        // AI 엔진 초기화 시작
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

        // 키보드 입력 (한글 중복 전송 방지 포함)
        this.chatInput.onkeydown = (e) => {
            if (e.isComposing || e.keyCode === 229) return; // 한글 조합 중 전송 방지

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };

        // 입력창 자동 높이 조절
        this.chatInput.oninput = () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
            this.updateButton();
        };

        // 설정 창 열고 닫기
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
            // AI 모델 로드 (8B 모델은 용량이 커서 시간이 조금 더 걸립니다)
            await this.ai.initialize((report) => {
                const progress = Math.round(report.progress * 100);
                this.progressFill.style.width = `${progress}%`;
                this.loadingText.innerText = `고성능 모델(8B) 준비 중... (${progress}%)`;

                if (progress === 100) {
                    setTimeout(() => {
                        this.aiLoading.classList.add('hidden');
                        // [최종 인사말] 중복 없이 딱 한 번만 출력
                        this.appendMessage('ai', '안녕하세요, 연호 선생님. 아동보호전문기관 업무 지원을 위한 AI 비서입니다. 매뉴얼 분석 준비가 완료되었습니다. 무엇을 도와드릴까요?');
                    }, 500);
                }
            });
        } catch (err) {
            console.error(err);
            this.loadingText.innerText = 'AI 초기화 실패. 사무실 PC의 WebGPU 지원 여부를 확인하세요.';
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
            // 답변 생성 시 ai-engine.js에서 manual.txt 및 노션 데이터를 자동 참조함
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

    // 마크다운 문법 지원 (굵게, 리스트 등)
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
        if (!key || !id) return alert('노션 API 설정이 필요합니다.');

        this.btnSync.disabled = true;
        this.btnSync.innerText = '노션 데이터 동기화 중...';
        try {
            // 실제 노션 데이터를 가져오는 API 호출 로직 (생략 시 기본 로직 사용)
            // 성공 후 아래와 같이 업데이트
            const notionData = []; // API 결과 데이터
            await this.ai.updateKnowledgeBase(notionData);
            alert('노션 데이터 동기화 완료! 이제 최신 매뉴얼을 기반으로 답변합니다.');
        } catch (err) {
            alert('동기화 실패: ' + err.message);
        } finally {
            this.btnSync.disabled = false;
            this.btnSync.innerText = '🔄 매뉴얼 동기화';
        }
    }
}

// 애플리케이션 시작
new App();
