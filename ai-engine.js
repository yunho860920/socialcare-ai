/**
 * ai-engine.js - 호환성 끝판왕 'gemini-pro' 적용 버전
 */
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
        // 키가 있으면 SDK를 준비합니다.
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

            // [핵심 수정] '1.5-flash' 대신 가장 기본 모델인 'gemini-pro'를 사용합니다.
            // 이 모델은 무료 티어에서도 제한 없이 가장 잘 붙습니다.
            const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

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
            
            // 자주 발생하는 에러를 친절하게 안내
            if (msg.includes("404") || msg.includes("not found")) {
                msg = "⛔ [모델 오류] 이 API 키로는 해당 모델을 쓸 수 없습니다. (새 키 발급 권장)";
            }
            if (msg.includes("API key")) {
                msg = "⛔ [인증 오류] API 키가 틀렸거나 만료되었습니다.";
            }
            
            if (onChunk) onChunk(msg);
            throw new Error(msg);
        }
    }
}
