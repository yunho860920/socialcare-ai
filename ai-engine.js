/**
 * ai-engine.js - 안정화 v1 버전 + API 키 공백 자동 제거
 */
export class AIEngine {
    constructor() {
        // [중요] 키를 넣을 때 따옴표 안에 공백이 없도록 주의하세요!
        // 혹시 공백이 있어도 .trim() 함수가 자동으로 지워줍니다.
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto".trim(); 
        this.localManualContent = "";
    }

    async initialize(onProgress) {
        await this.fetchManualFile();
        onProgress({ progress: 1.0 });
    }

    async fetchManualFile() {
        try {
            const response = await fetch('./manual.txt');
            if (response.ok) {
                this.localManualContent = await response.text();
                console.log("[FILE_CHECK] manual.txt 로드 성공");
            }
        } catch (e) {
            console.error("[FILE_CHECK] 파일 로드 실패");
        }
    }

    async generateResponse(userInput, onChunk) {
        // [핵심 변경 1] v1beta -> v1 (가장 안정적인 정식 버전)
        // [핵심 변경 2] 모델명 -> gemini-1.5-flash (무료 티어 표준 모델)
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 한국어로 답변하라.
        
[매뉴얼]
${this.localManualContent || "내용 없음"}

질문: ${userInput}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const data = await response.json();
            
            // 만약 에러가 나면, 구체적인 이유를 화면에 보여줍니다.
            if (!response.ok) {
                const errorMsg = data.error ? data.error.message : "알 수 없는 오류";
                throw new Error(`구글 서버 거절: ${errorMsg}`);
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            } else {
                return "답변을 생성하지 못했습니다. (내용 필터링됨)";
            }

        } catch (error) {
            // 이 에러 메시지가 채팅창에 그대로 뜹니다.
            return "⛔ 연결 실패: " + error.message; 
        }
    }
}
