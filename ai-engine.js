/**
 * ai-engine.js - 최신 표준 모델(1.5-flash) 복귀 버전
 */
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
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
            if (!this.genAI) {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
            }

            // [정답] 새 프로젝트 키에서는 이 모델이 기본입니다.
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
            [매뉴얼]
            ${this.localManualContent || "내용 없음"}

            질문: ${userInput}`;

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
            if (msg.includes("404")) msg = "⛔ [모델 권한 없음] 구글 AI Studio에서 'New Project'로 키를 다시 받아주세요.";
            if (msg.includes("API key")) msg = "⛔ [키 오류] API 키가 잘못되었습니다.";
            
            if (onChunk) onChunk(msg);
            throw new Error(msg);
        }
    }
}
