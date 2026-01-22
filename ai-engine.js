/**
 * ai-engine.js - 호환성 문제를 해결한 최종 정식 버전
 */
export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim(); 
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
        } catch (e) { console.error("파일 로드 실패"); }
    }

    async generateResponse(userInput, onChunk) {
        // [핵심] v1beta 대신 정식 버전인 v1 주소를 사용하고, 모델명을 명확히 지정합니다.
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 한국어로 답변하라.
[매뉴얼]
${this.localManualContent || "내용 없음"}

질문: ${userInput}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error ? data.error.message : "연결 오류";
                throw new Error(errorMsg);
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            } else {
                return "답변을 생성할 수 없습니다. 다시 시도해주세요.";
            }

        } catch (error) {
            const msg = "⛔ 오류: " + error.message;
            if (onChunk) onChunk(msg);
            return msg;
        }
    }
}
