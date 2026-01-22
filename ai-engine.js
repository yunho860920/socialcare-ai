/**
 * ai-engine.js - Gemini API + manual.txt 완벽 통합 버전
 */
export class AIEngine {
    constructor() {
        // [중요] 여기에 복사하신 API 키를 붙여넣으세요.
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto"; 
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        this.localManualContent = "";
    }

    async initialize(onProgress) {
        onProgress({ progress: 0.5 });
        await this.fetchManualFile(); // manual.txt 로드
        onProgress({ progress: 1.0 });
    }

    async fetchManualFile() {
        try {
            // manual.txt 파일을 읽어와 변수에 저장
            const response = await fetch('./manual.txt');
            if (response.ok) {
                this.localManualContent = await response.text();
                console.log("[FILE_CHECK] manual.txt 로드 성공");
            }
        } catch (e) {
            console.error("[FILE_CHECK] 파일을 찾을 수 없습니다.");
        }
    }

    async generateResponse(userInput, onChunk) {
        // 제미나이에게 전달할 지침 (RAG 방식)
        const systemPrompt = `너는 아동보호전문기관 업무 비서다. 
아래 제공된 [매뉴얼 내용]을 바탕으로 한국어로 답변하라.

[매뉴얼 내용]
${this.localManualContent || "매뉴얼 데이터가 없습니다."}

**[응대 원칙]**
1. 답변 시작 시 반드시 "[업무 지침 기반 답변]"이라고 머리말을 붙여라.
2. 매뉴얼에 있는 내용을 우선적으로 답변하고, 없는 내용은 일반적인 상식임을 밝혀라.
3. 절대 외계어나 한자를 섞지 말고 깔끔한 한국어 문장으로 답변하라.`;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n질문: ${userInput}` }] }]
                })
            });

            const data = await response.json();
            const fullText = data.candidates[0].content.parts[0].text;
            
            if (onChunk) onChunk(fullText);
            return fullText;
        } catch (error) {
            console.error("Gemini 호출 오류:", error);
            throw new Error("답변 생성 중 오류가 발생했습니다.");
        }
    }
}
