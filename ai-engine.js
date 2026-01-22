/**
 * ai-engine.js - 최적 호환성 버전
 */
export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
        // 전역 객체에서 SDK를 가져옵니다
        const genAI = window.googleGenerativeAI;
        this.modelManager = new genAI.GoogleGenerativeAI(this.apiKey);
        this.localManualContent = "";
    }

    async initialize(onProgress) {
        try {
            const response = await fetch('./manual.txt');
            if (response.ok) this.localManualContent = await response.text();
        } catch (e) { console.warn("매뉴얼 로드 실패"); }
        onProgress({ progress: 1.0 });
    }

    async generateResponse(userInput, onChunk) {
        // [핵심] 가장 안정적인 모델로 고정
        const model = this.modelManager.getGenerativeModel({ model: "gemini-1.5-flash" });
        const promptText = `매뉴얼을 기반으로 답변하라:\n${this.localManualContent}\n질문: ${userInput}`;

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
            const msg = `⛔ 오류: ${error.message}`;
            if (onChunk) onChunk(msg);
            throw error;
        }
    }
}
