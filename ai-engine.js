/**
 * ai-engine.js - Gemini API 404 오류 해결 버전
 */
export class AIEngine {
    constructor() {
        // [필수] 아까 복사한 AIzaSy...로 시작하는 키를 여기에 정확히 붙여넣으세요.
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto"; 
        
        // 주소 형식을 가장 안정적인 버전으로 수정했습니다.
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        this.localManualContent = "";
    }

    async initialize(onProgress) {
        onProgress({ progress: 1.0 }); // 로컬 모델이 아니므로 즉시 완료
        await this.fetchManualFile();
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
        // 제미나이에게 전달할 최종 지침
        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 근거로 한국어로 답변하라.
        
[매뉴얼 내용]
${this.localManualContent || "매뉴얼 데이터 없음"}

질문: ${userInput}`;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: promptText }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "API 호출 실패");
            }

            const data = await response.json();
            const fullText = data.candidates[0].content.parts[0].text;
            
            if (onChunk) onChunk(fullText);
            return fullText;
        } catch (error) {
            console.error("Gemini Error:", error);
            return "오류가 발생했습니다: " + error.message;
        }
    }
}
