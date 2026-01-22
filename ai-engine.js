/**
 * ai-engine.js - 제미나이 API 호출 안정화 버전
 */
export class AIEngine {
    constructor() {
        // [필수] 발급받으신 키를 여기에 꼭 넣어주세요!
        this.apiKey = "YOUR_GEMINI_API_KEY"; 
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
                console.log("[FILE_CHECK] manual.txt 로드 성공");
            }
        } catch (e) {
            console.error("파일 로드 실패");
        }
    }

    async generateResponse(userInput, onChunk) {
        // 주소 형식을 가장 확실한 규격으로 고정
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const promptText = `너는 아동보호전문기관 업무 비서다. 제공된 매뉴얼을 근거로 한국어로 답변하라.
        
매뉴얼: ${this.localManualContent}

질문: ${userInput}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            const data = await response.json();
            
            // 답변 추출 로직 강화
            if (data.candidates && data.candidates[0].content) {
                const fullText = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(fullText);
                return fullText;
            } else {
                throw new Error("답변을 생성하지 못했습니다.");
            }
        } catch (error) {
            console.error("Gemini Error:", error);
            return "오류: " + error.message;
        }
    }
}
