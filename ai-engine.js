export class AIEngine {
    constructor() {
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto"; // 여기에 복사한 키 입력
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        this.localManualContent = "";
    }

    async initialize(onProgress) {
        // 제미나이는 모델 다운로드가 필요 없으므로 즉시 완료 처리
        onProgress({ progress: 1.0 }); 
        await this.fetchManualFile();
    }

    async fetchManualFile() {
        try {
            const response = await fetch('./manual.txt');
            if (response.ok) {
                this.localManualContent = await response.text();
            }
        } catch (e) {
            console.error("파일 로드 실패");
        }
    }

    async generateResponse(userInput, onChunk) {
        const systemPrompt = `너는 아동보호전문기관 업무 비서다. 다음 매뉴얼을 근거로 답변하라: ${this.localManualContent}`;
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n질문: ${userInput}` }] }]
                })
            });
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            if (onChunk) onChunk(text);
            return text;
        } catch (e) {
            return "오류가 발생했습니다. API 키를 확인해주세요.";
        }
    }
}
