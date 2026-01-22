/**
 * ai-engine.js - 오류 정밀 진단 버전
 */
export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
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
        // [해결책 2] 가장 표준적인 주소 체계 사용
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

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

            // [오류 진단] 왜 안 되는지 상세하게 알려줍니다.
            if (!response.ok) {
                let msg = data.error ? data.error.message : "알 수 없는 오류";
                
                // 자주 발생하는 에러를 한국어로 번역해서 보여줌
                if (response.status === 404) msg = "❌ [404 오류] 모델을 찾을 수 없습니다. (gemini-1.5-flash)";
                if (response.status === 400 && msg.includes('API key')) msg = "❌ [키 오류] API 키가 잘못되었거나 만료되었습니다. 다시 입력해주세요.";
                if (response.status === 429) msg = "⏳ [대기] 사용량이 많아 잠시 멈췄습니다. 30초 뒤에 해보세요.";
                
                throw new Error(msg);
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            } else {
                return "AI가 답변을 생성하지 못했습니다. (빈 응답)";
            }

        } catch (error) {
            const errorMsg = "⚠️ " + error.message;
            if (onChunk) onChunk(errorMsg);
            return errorMsg;
        }
    }
}
