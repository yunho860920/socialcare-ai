/**
 * ai-engine.js - 40년 차 전문가 최적화 버전 (SDK 방식)
 */
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
        this.genAI = new GoogleGenerativeAI(this.apiKey);
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
        } catch (e) { console.error("매뉴얼 로드 실패"); }
    }

    async generateResponse(userInput, onChunk) {
        // [핵심] 사용 가능한 모델 후보군 (안정성 순위)
        const models = ["gemini-1.5-flash", "gemini-pro"];
        let lastError = null;

        for (const modelName of models) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
                [매뉴얼] ${this.localManualContent || "내용 없음"}
                질문: ${userInput}`;

                const result = await model.generateContentStream(promptText);
                let fullText = "";
                
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    fullText += chunkText;
                    if (onChunk) onChunk(fullText);
                }
                return fullText; // 성공 시 즉시 반환

            } catch (error) {
                lastError = error;
                console.warn(`${modelName} 연결 실패, 다음 모델 시도 중...`);
                continue; // 실패 시 다음 모델로 이동
            }
        }
        
        // 모든 모델 실패 시 에러 출력
        const finalMsg = `⛔ 연결 실패: ${lastError.message}. 구글 AI Studio에서 '+ 새 프로젝트 만들기'를 통해 키를 다시 받아주세요.`;
        if (onChunk) onChunk(finalMsg);
        throw lastError;
    }
}
