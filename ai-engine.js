/**
 * ai-engine.js - 구글 공식 SDK 사용 버전 (오류 해결 끝판왕)
 */
// 👇 공식 도구를 가져옵니다.
import { GoogleGenerativeAI } from "@google/generative-ai";

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
        } catch (e) { console.error("파일 로드 실패"); }
    }

    async generateResponse(userInput, onChunk) {
        try {
            // [핵심] 주소를 직접 치지 않고, 공식 도구가 알아서 모델을 찾아옵니다.
            // 가장 최신이며 안정적인 'gemini-1.5-flash'를 호출합니다.
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
            [매뉴얼]
            ${this.localManualContent || "내용 없음"}

            질문: ${userInput}`;

            // 스트리밍 방식으로 답변을 요청합니다.
            const result = await model.generateContentStream(promptText);

            let fullText = "";
            
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                if (onChunk) onChunk(fullText);
            }

            return fullText;

        } catch (error) {
            // 에러가 나면 여기서 잡습니다.
            let msg = "오류 발생: " + error.message;
            
            if (msg.includes("404")) msg = "⛔ 모델을 찾을 수 없습니다. (하지만 SDK를 쓰면 이 확률은 낮습니다)";
            if (msg.includes("API key")) msg = "⛔ API 키가 유효하지 않습니다. 새로고침 후 다시 입력해주세요.";
            
            if (onChunk) onChunk(msg);
            throw new Error(msg);
        }
    }
}
