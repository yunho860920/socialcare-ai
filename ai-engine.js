/**
 * ai-engine.js - Gemini API 주소 오류 및 파일 로드 수정 버전
 */
export class AIEngine {
    constructor() {
        // [필수] 복사하신 AIzaSy... 키를 여기에 넣으세요.
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto"; 
        this.localManualContent = "";
    }

    async initialize(onProgress) {
        // 1. 파일 로드부터 수행
        await this.fetchManualFile();
        // 2. 초기화 완료 보고
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
            console.error("[FILE_CHECK] 파일 로드 실패");
        }
    }

    async generateResponse(userInput, onChunk) {
        // [수정] 모델 경로를 더 안정적인 v1 버전으로 변경
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 한국어로 답변하라.
        
[매뉴얼 내용]
${this.localManualContent || "매뉴얼 데이터 없음"}

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
            
            if (data.error) {
                throw new Error(data.error.message);
            }

            const fullText = data.candidates[0].content.parts[0].text;
            
            if (onChunk) onChunk(fullText);
            return fullText;
        } catch (error) {
            console.error("Gemini Error:", error);
            return "오류가 발생했습니다: " + error.message;
        }
    }
}
