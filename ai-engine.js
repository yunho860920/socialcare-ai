/**
 * ai-engine.js - 키를 코드에 저장하지 않는 보안 버전
 */
export class AIEngine {
    // [중요] 이제 여기에 API 키를 적지 않습니다!
    // app.js에서 넘겨주는 키를 받아서 씁니다.
    constructor(apiKey) {
        this.apiKey = apiKey; 
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
            }
        } catch (e) { console.error("파일 로드 실패"); }
    }

    async generateResponse(userInput, onChunk) {
        // 무료 사용 가능한 실험용 모델
        const modelName = "gemini-2.0-flash-exp";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
        [매뉴얼] ${this.localManualContent || "내용 없음"}
        질문: ${userInput}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const data = await response.json();

            if (!response.ok) {
                // 에러 발생 시 상세 내용 출력
                let errorMsg = data.error ? data.error.message : "알 수 없는 오류";
                if (response.status === 429) errorMsg = "⛔ (사용량 제한) 잠시 후 다시 시도해주세요.";
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
