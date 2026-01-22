/**
 * ai-engine.js - 콘솔 로그 복구 및 제미나이 연결 최종본
 */
export class AIEngine {
    constructor() {
        // [필수] 복사하신 AIzaSy... 키를 여기에 정확히 넣으세요.
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto"; 
        this.localManualContent = "";
    }

    async initialize(onProgress) {
        // 1. 파일부터 읽기 (성공 시 콘솔에 로그가 찍힙니다)
        await this.fetchManualFile();
        
        // 2. 초기화 완료 표시
        onProgress({ progress: 1.0 });
    }

    async fetchManualFile() {
        try {
            const response = await fetch('./manual.txt');
            if (response.ok) {
                this.localManualContent = await response.text();
                // 이 로그가 다시 콘솔에 나타나게 됩니다.
                console.log("[FILE_CHECK] manual.txt 로드 성공");
            } else {
                console.error("[FILE_CHECK] manual.txt 파일을 찾을 수 없습니다 (404)");
            }
        } catch (e) {
            console.error("[FILE_CHECK] 파일 로드 중 오류 발생:", e);
        }
    }

    async generateResponse(userInput, onChunk) {
        // 제미나이 API 주소 (최신 버전 형식)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

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
