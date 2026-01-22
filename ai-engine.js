/**
 * ai-engine.js - 호환성 문제 해결 및 안정화 버전 (Gemini Pro)
 */
export class AIEngine {
    constructor() {
        // [필수] 복사해둔 API 키를 여기에 넣으세요!
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto"; 
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
            console.error("[FILE_CHECK] 파일 로드 실패");
        }
    }

    async generateResponse(userInput, onChunk) {
        // [핵심 수정] 모델명을 'gemini-1.5-flash'에서 'gemini-pro'로 변경하여 404 오류 방지
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;

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
            
            // 에러 발생 시 상세 원인 출력
            if (data.error) {
                console.error("Gemini API Error:", data.error);
                throw new Error(data.error.message);
            }

            if (data.candidates && data.candidates.length > 0) {
                const fullText = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(fullText);
                return fullText;
            } else {
                return "답변을 생성할 수 없습니다. (데이터 형식 오류)";
            }

        } catch (error) {
            console.error("System Error:", error);
            return "시스템 오류가 발생했습니다: " + error.message;
        }
    }
}
