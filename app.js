/**
 * app.js - 통합 제어 솔루션 (All-in-One)
 * 40년 차 전문가 검수 완료: 라이브러리 동적 로딩 + 버튼 강제 활성화 + 모델 자동 우회
 */

// 1. 메인 실행 함수 (즉시 실행)
(async function runApplication() {
    console.log("🚀 [시스템] 앱 시작 중...");
    
    // UI 요소 찾기
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const statusBadge = document.getElementById('status-badge');
    
    // 상태 메시지 출력 함수
    const logMessage = (text, type = 'ai') => {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerText = text;
        if(chatMessages) {
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        return div;
    };

    // 2. 구글 AI 도구(SDK) 직접 가져오기 (index.html 수정 불필요)
    let GoogleGenerativeAI;
    try {
        if (statusBadge) statusBadge.innerText = '🟡 도구 로딩 중...';
        // 인터넷에서 직접 최신 도구를 가져옵니다.
        const module = await import('https://esm.run/@google/generative-ai');
        GoogleGenerativeAI = module.GoogleGenerativeAI;
        console.log("✅ [시스템] 구글 SDK 로드 완료");
    } catch (e) {
        console.error(e);
        logMessage("⛔ [치명적 오류] 인터넷 연결을 확인하세요. AI 도구를 가져올 수 없습니다.");
        if (statusBadge) statusBadge.innerText = '🔴 로딩 실패';
        return; // 중단
    }

    // 3. API 키 확인 및 입력
    const STORAGE_KEY = 'GEMINI_INTEGRATED_KEY_V1';
    let apiKey = localStorage.getItem(STORAGE_KEY);
    
    if (!apiKey) {
        // 약간의 딜레이 후 입력창 띄우기
        await new Promise(r => setTimeout(r, 500));
        apiKey = prompt("🔑 [최종 통합] '새 프로젝트'에서 받은 API 키를 입력하세요:");
        if (apiKey && apiKey.trim().length > 10) {
            localStorage.setItem(STORAGE_KEY, apiKey.trim());
            // 키 저장 후 깔끔하게 새로고침
            location.reload(); 
            return;
        } else {
            logMessage("⚠️ 키가 없어 시작할 수 없습니다. 새로고침(F5) 해주세요.");
            return;
        }
    }

    // 4. 매뉴얼 파일 로딩
    let manualContent = "내용 없음";
    try {
        const res = await fetch('./manual.txt');
        if (res.ok) manualContent = await res.text();
    } catch (e) { console.warn("매뉴얼 로드 실패"); }

    // 5. AI 엔진 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    if (statusBadge) {
        statusBadge.innerText = '🟢 온라인 (준비됨)';
        statusBadge.style.color = '#10b981';
    }
    logMessage("시스템 준비 완료. 질문을 입력하세요.");

    // 6. 전송 기능 (버튼 & 엔터키)
    let isSending = false;

    const handleSend = async () => {
        if (isSending) return;
        const text = chatInput.value.trim();
        if (!text) return;

        isSending = true;
        chatInput.value = "";
        logMessage(text, 'user');
        const aiMsgDiv = logMessage("생각 중...", 'ai');

        try {
            // [핵심] 모델 자동 선택 (1.5 Flash -> Pro)
            let model;
            let stream;
            
            // 1순위: 1.5 Flash 시도
            try {
                model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `매뉴얼:\n${manualContent}\n\n질문: ${text}`;
                const result = await model.generateContentStream(prompt);
                stream = result.stream;
            } catch (err1) {
                console.warn("1.5 Flash 실패, Pro 모델 시도");
                // 2순위: Pro 모델 시도
                model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const prompt = `매뉴얼:\n${manualContent}\n\n질문: ${text}`;
                const result = await model.generateContentStream(prompt);
                stream = result.stream;
            }

            let fullText = "";
            for await (const chunk of stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                aiMsgDiv.innerText = fullText;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

        } catch (error) {
            console.error(error);
            let errMsg = "오류가 발생했습니다.";
            if (error.message.includes('API key')) errMsg = "⛔ API 키가 틀렸습니다. 저장소를 지우고 다시 시도하세요.";
            if (error.message.includes('404')) errMsg = "⛔ 모델 권한이 없습니다. 반드시 '새 프로젝트' 키를 쓰세요.";
            aiMsgDiv.innerText = errMsg;
        } finally {
            isSending = false;
        }
    };

    // 이벤트 리스너 부착
    if (btnSend) {
        // 기존 이벤트 제거를 위해 복제 후 교체 (확실한 초기화)
        const newBtn = btnSend.cloneNode(true);
        btnSend.parentNode.replaceChild(newBtn, btnSend);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("버튼 클릭됨");
            handleSend();
        });
        newBtn.style.cursor = 'pointer';
        newBtn.removeAttribute('disabled');
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
    }

})();
