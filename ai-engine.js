/**
 * ai-engine.js - 무료 사용 가능한 gemini-2.0-flash-exp 모델 적용
 */
export class AIEngine {
    constructor() {
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto".trim(); // API 키 입력
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
        // [핵심] 무료 티어에서 작동하는 'gemini-2.0-flash-exp' 모델 사용
        const modelName = "gemini-2.0-flash-exp";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

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
            
            // 에러 처리
            if (!response.ok) {
                // 429 에러(용량 초과)가 뜨면 잠시 기다리라는 안내 메시지 출력
                if (response.status === 429) {
                    return "⛔ (사용량 제한) 잠시 후 다시 질문해주세요. 무료 버전은 분당 요청 횟수 제한이 있습니다.";
                }
                const errorMsg = data.error ? data.error.message : "알 수 없는 오류";
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
