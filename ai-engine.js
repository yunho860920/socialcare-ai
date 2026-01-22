/**
 * ai-engine.js - gemini-pro 적용 버전
 */
export class AIEngine {
    constructor() {
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto"; // [중요] 키가 들어있는지 꼭 확인!
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
        // [핵심] 404 안 뜨는 가장 안전한 주소 조합 (gemini-pro + v1beta)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;

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
            
            if (data.error) throw new Error(data.error.message);
            
            const text = data.candidates[0].content.parts[0].text;
            if (onChunk) onChunk(text);
            return text;

        } catch (error) {
            return "오류: " + error.message;
        }
    }
}
