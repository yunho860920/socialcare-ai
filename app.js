/**
 * app.js - 키 검증 및 진단 모드 (Diagnostic Mode)
 * 40년 차 전문가 처방: 브라우저 캐시 강제 삭제 및 즉시 연결 테스트
 */

(async function runDiagnosticApp() {
    console.log("🚀 [진단 모드] 앱 시작...");

    // UI 요소 가져오기
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    
    // 1. [강제 조치] 기존에 저장된 모든 키를 삭제합니다. (좀비 키 제거)
    // 이 코드가 있으면 새로고침 할 때마다 무조건 키를 다시 물어봅니다.
    // 연결이 성공하면 나중에 이 줄만 지우면 됩니다.
    localStorage.clear(); 
    console.log("🧹 브라우저 기억 소거 완료");

    // 메시지 출력 도우미
    const log = (msg, type = 'ai') => {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerText = msg;
        if(chatMessages) {
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        return div;
    };

    // 2. 키 입력 및 즉시 검증 (Health Check)
    let apiKey = prompt("🔑 [진단] '새 프로젝트'의 API 키를 붙여넣으세요:\n(방금 받은 키여야 합니다!)");

    if (!apiKey || apiKey.length < 10) {
        log("⛔ 키가 입력되지 않았습니다. 새로고침(F5) 하세요.");
        return;
    }

    log("🔍 키 검증 중... (잠시만 기다리세요)");

    // 3. 구글 서버에 '안녕'이라고 찔러보기 (모델: gemini-1.5-flash)
    try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const testResponse = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        if (!testResponse.ok) {
            const errData = await testResponse.json();
            console.error(errData);
            throw new Error(`[거부됨] 구글이 키를 거부했습니다.\n이유: ${errData.error?.message || testResponse.statusText}`);
        }

        log("✅ [검증 성공] 키가 정상 작동합니다! 연결됨.", "ai");
        log("이제 매뉴얼에 대해 질문해 주세요.", "ai");

    } catch (e) {
        log(`❌ [검증 실패] 입력하신 키로는 연결할 수 없습니다.\n${e.message}`);
        log("💡 해결책: Google AI Studio에서 프로젝트를 새로 만들고 키를 다시 받으세요.");
        return; // 앱 중단
    }

    // 4. 매뉴얼 로딩
    let manualText = "";
    try {
        const res = await fetch('./manual.txt');
        if (res.ok) manualText = await res.text();
    } catch(e) { console.warn("매뉴얼 없음"); }

    // 5. 채팅 기능 활성화 (검증 통과 시에만 작동)
    let isSending = false;

    const handleSend = async () => {
        if (isSending) return;
        const text = chatInput.value.trim();
        if (!text) return;

        isSending = true;
        chatInput.value = "";
        log(text, 'user');
        const aiDiv = log("...", 'ai');

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
            if (data.candidates && data.candidates.length > 0) {
                aiDiv.innerText = data.candidates[0].content.parts[0].text;
            } else {
                aiDiv.innerText = "답변을 생성하지 못했습니다.";
            }

        } catch (error) {
            aiDiv.innerText = "통신 오류: " + error.message;
        } finally {
            isSending = false;
        }
    };

    // 버튼 이벤트 연결 (기존 이벤트 제거 후 재부착)
    if (btnSend) {
        const newBtn = btnSend.cloneNode(true);
        btnSend.parentNode.replaceChild(newBtn, btnSend);
        newBtn.addEventListener('click', (e) => { e.preventDefault(); handleSend(); });
        newBtn.style.cursor = 'pointer';
    }
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
    });

})();
