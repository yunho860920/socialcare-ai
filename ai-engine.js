/**
 * ai-engine.js - 라이브러리 주소 직접 호출 (오프라인 해결)
 */

// 👇 [핵심 수정] 짧은 이름 대신, 인터넷 전체 주소를 직접 적습니다.
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
        // 키가 있으면 SDK를 즉시 로드합니다.
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
        }
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
        try {
            // 안전장치: 키가 없으면 에러
            if (!this.genAI) {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
            }

            // 공식 도구로 모델 소환 (가장 안정적인 1.5 Flash)
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
            [매뉴얼]
            ${this.localManualContent || "내용 없음"}

            질문: ${userInput}`;

            // 답변 요청
            const result = await model.generateContentStream(promptText);

            let fullText = "";
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                if (onChunk) onChunk(fullText);
            }
            return fullText;

        } catch (error) {
            let msg = "오류: " + error.message;
            if (msg.includes("API key")) msg = "⛔ API 키가 틀렸습니다. 다시 입력해주세요.";
            if (msg.includes("404")) msg = "⛔ 모델 연결 실패. (잠시 후 다시 시도해주세요)";
            
            if (onChunk) onChunk(msg);
            throw new Error(msg);
        }
    }
}
