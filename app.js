/**
 * app.js - Universal Model Scanner (최종 호환성 버전)
 * 40년 차 전문가 설계: 가능한 모든 모델을 스캔하여 작동하는 모델 자동 선택
 */

(async function runScannerApp() {
    console.log("🚀 [시스템] 모델 자동 스캐너 가동...");

    // UI 요소
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    
    // 메시지 출력 함수
    const log = (text, type = 'ai') => {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerText = text;
        if(chatMessages) {
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        return div;
    };

    // 1. 키 입력 및 정제
    const STORAGE_KEY = 'GEMINI_SCANNER_KEY_V1';
    let apiKey = localStorage.getItem(STORAGE_KEY);

    if (!apiKey) {
        // 약간 대기 후 입력창
        await new Promise(r => setTimeout(r, 500));
        apiKey = prompt("🔑 [스캐너 모드] '새 프로젝트'의 API 키를 입력하세요:");
        if (apiKey) {
            // 혹시 모를 따옴표나 공백 제거 (강력 정제)
            apiKey = apiKey.replace(/["']/g, "").trim();
            localStorage.setItem(STORAGE_KEY, apiKey);
            location.reload();
            return;
        } else {
            alert("키가 필요합니다.");
            return;
        }
    }

    // 2. [핵심] 사용 가능한 모델 목록 (우선순위 순)
    // 하나가 안 되면 다음 것으로 자동 넘어갑니다.
    const MODEL_CANDIDATES = [
        "gemini-1.5-flash",       // 1순위: 최신, 빠름
        "gemini-1.5-flash-8b",    // 2순위: 초경량
        "gemini-2.0-flash-exp",   // 3순위: 실험용 (가끔 됨)
        "gemini-pro",             // 4순위: 구형 (가장 안정적)
        "gemini-1.0-pro"          // 5순위: 호환성용
    ];

    let VALID_MODEL = null; // 찾은 모델을 여기에 저장

    // 3. 모델 스캔 시작 (접속하자마자 실행)
    log("📡 사용 가능한 AI 모델을 찾는 중...", "ai");
    
    for (const modelName of MODEL_CANDIDATES) {
        try {
            console.log(`Checking ${modelName}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            
            // 가볍게 '안녕' 한마디 던져보기
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
            });

            if (response.ok) {
                VALID_MODEL = modelName;
                console.log(`✅ 성공! 찾은 모델: ${modelName}`);
                log(`✅ 연결 성공! (${modelName})`, "ai");
                log("이제 질문하셔도 됩니다.", "ai");
                break; // 찾았으니 스캔 중단
            }
        } catch (e) {
            console.warn(`${modelName} 실패`);
        }
    }

    if (!VALID_MODEL) {
        log("❌ [치명적 오류] 모든 모델 연결 실패.");
        log("💡 팁: API 키가 정확한지, '새 프로젝트'가 맞는지 다시 확인해주세요.");
        localStorage.removeItem(STORAGE_KEY); // 키가 틀렸을 테니 삭제
        return;
    }

    // 4. 매뉴얼 로딩
    let manualText = "";
    try {
        const res = await fetch('./manual.txt');
        if (res.ok) manualText = await res.text();
    } catch(e) {}

    // 5. 채팅 로직 (찾아낸 VALID_MODEL 사용)
    let isSending = false;

    const handleSend = async () => {
        if (isSending) return;
        const text = chatInput.value.trim();
        if (!text) return;

        isSending = true;
        chatInput.value = "";
        log(text, 'user');
        const aiDiv = log("생각 중...", 'ai');

        try {
            // 스캔에서 찾은 모델 주소 사용
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${VALID_MODEL}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ 
                        parts: [{ text: `너는 사회복지사야. 아래 매뉴얼을 보고 답변해.\n[매뉴얼]: ${manualText}\n\n질문: ${text}` }] 
                    }]
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error?.message || "API 오류");
            }

            if (data.candidates && data.candidates.length > 0) {
                aiDiv.innerText = data.candidates[0].content.parts[0].text;
            } else {
                aiDiv.innerText = "답변 내용이 없습니다.";
            }

        } catch (error) {
            aiDiv.innerText = "오류: " + error.message;
        } finally {
            isSending = false;
        }
    };

    // 버튼 활성화 (복제 후 재부착으로 기존 이벤트 제거)
    if (btnSend) {
        const newBtn = btnSend.cloneNode(true);
        btnSend.parentNode.replaceChild(newBtn, btnSend);
        newBtn.addEventListener('click', (e) => { e.preventDefault(); handleSend(); });
        newBtn.style.cursor = 'pointer';
        newBtn.removeAttribute('disabled');
    }
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
    });

})();
