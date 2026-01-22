/**
 * ai-engine.js - Gemini 2.0 Flash 모델 적용 (최종 해결본)
 */
export class AIEngine {
    constructor() {
        this.apiKey = "YOUR_GEMINI_API_KEY".trim(); // 여기에 API 키를 넣으세요
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
        // [핵심] 선생님 키로 사용 가능한 'gemini-2.0-flash' 모델로 확정!
        const modelName = "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
        
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
            
            if (!response.ok) {
                // 만약 또 에러가 나면 화면에 그대로 보여줍니다.
                const errorMsg = data.error ? data.error.message : "알 수 없는 오류";
                throw new Error(errorMsg);
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            } else {
                return "답변을 생성하지 못했습니다.";
            }

        } catch (error) {
            const msg = "⛔ 오류: " + error.message;
            if (onChunk) onChunk(msg);
            return msg;
        }
    }
}
