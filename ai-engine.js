/**
 * ai-engine.js - 자동 모델 우회(Fallback) 시스템
 */
export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
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

    // [핵심 기술] 모델 자동 스위칭 함수
    async generateResponse(userInput, onChunk) {
        // 1순위: 최신 모델 (1.5 Flash)
        try {
            return await this.callApi("gemini-1.5-flash", userInput, onChunk);
        } catch (error1) {
            // 1순위 실패 시(404 등), 2순위로 자동 전환
            if (error1.message.includes("404") || error1.message.includes("not found")) {
                if (onChunk) onChunk("⚠️ 최신 모델 연결 실패, '안전 모델(gemini-pro)'로 우회 접속합니다...");
                try {
                    // 2순위: 가장 기초 모델 (gemini-pro)
                    return await this.callApi("gemini-pro", userInput, onChunk);
                } catch (error2) {
                    throw new Error("모든 모델 접속 실패: " + error2.message);
                }
            } else {
                throw error1; // 다른 에러면 그냥 보고함
            }
        }
    }

    // 실제 API 호출을 담당하는 내부 함수
    async callApi(modelName, userInput, onChunk) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
        
        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
        [매뉴얼] ${this.localManualContent || "내용 없음"}
        질문: ${userInput}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const data = await response.json();

        if (!response.ok) {
            const msg = data.error ? data.error.message : "상태 코드 " + response.status;
            throw new Error(msg); // 에러를 던져서 위에서 잡게 함
        }

        if (data.candidates && data.candidates.length > 0) {
            const text = data.candidates[0].content.parts[0].text;
            if (onChunk) onChunk(text);
            return text;
        } else {
            return "답변이 비어있습니다.";
        }
    }
}
