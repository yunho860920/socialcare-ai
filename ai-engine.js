/**
 * ai-engine.js - 새 API 키 + 무료 모델(Exp) 최종 적용
 */
export class AIEngine {
    constructor() {
        // 👇 [중요] 방금 새로 발급받은 키를 여기에 넣으세요!
        this.apiKey = "AIzaSyAS82j1V-PTYcgYSnqNkP79OYqzzvaig7M".trim(); 
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
        // [정답] 무료로 쓸 수 있는 'gemini-2.0-flash-exp' 모델 사용
        const modelName = "gemini-2.0-flash-exp";
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
                const errorMsg = data.error ? data.error.message : "알 수 없는 오류";
                // 키 유출 에러가 또 뜨면 사용자에게 알려줌
                if (errorMsg.includes("leaked")) {
                    return "⛔ (보안 경고) 새 API 키가 또 차단되었습니다. 깃허브에 올릴 때 주의가 필요합니다.";
                }
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
