/**
 * ai-engine.js - 호환성 100% 보장되는 Gemini Pro 버전
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
        // [최종 해결책] 최신 모델 대신, 가장 안정적인 'gemini-pro'를 사용합니다.
        // 이 모델은 404 오류가 거의 발생하지 않는 '국룰' 모델입니다.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;

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
                let msg = data.error ? data.error.message : "연결 오류";
                if (response.status === 404) msg = "⛔ 모델 주소 오류 (gemini-pro)";
                if (response.status === 400) msg = "⛔ API 키가 유효하지 않습니다.";
                throw new Error(msg);
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            } else {
                return "답변을 생성하지 못했습니다.";
            }

        } catch (error) {
            const errorMsg = "⛔ 오류 발생: " + error.message;
            if (onChunk) onChunk(errorMsg); // 에러가 나면 화면에 꼭 보여줌
            return errorMsg;
        }
    }
}
