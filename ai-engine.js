/**
 * ai-engine.js - 가장 안정적인 표준 모델(1.5 Flash) 적용
 */
export class AIEngine {
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
        // [핵심 변경] 실험용(exp) 대신 '표준 모델(1.5-flash)' 사용
        // 이 모델은 속도가 빠르고 제한이 덜해서 가장 안정적입니다.
        const modelName = "gemini-1.5-flash";
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
                let errorMsg = data.error ? data.error.message : "알 수 없는 오류";
                if (response.status === 429) errorMsg = "⛔ (일시적 사용량 초과) 1분 뒤에 다시 시도해주세요.";
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
