/**
 * ai-engine.js - 전역 선언 버전
 */
window.AIEngine = class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
        const genAI = window.googleGenerativeAI;
        this.modelManager = new genAI.GoogleGenerativeAI(this.apiKey);
        this.localManualContent = "";
    }

    async initialize() {
        try {
            const response = await fetch('./manual.txt');
            if (response.ok) this.localManualContent = await response.text();
        } catch (e) { console.warn("매뉴얼 로드 실패"); }
    }

    async generateResponse(userInput, onChunk) {
        // [분석 결과] 새 프로젝트 키에서는 gemini-1.5-flash가 가장 정확합니다.
        const model = this.modelManager.getGenerativeModel({ model: "gemini-1.5-flash" });
        const promptText = `매뉴얼 데이터:\n${this.localManualContent}\n\n질문: ${userInput}`;

        try {
            const result = await model.generateContentStream(promptText);
            let fullText = "";
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                if (onChunk) onChunk(fullText);
            }
            return fullText;
        } catch (error) {
            // [정밀 진단] 구체적인 에러 메시지 출력
            throw new Error(error.message);
        }
    }
}
