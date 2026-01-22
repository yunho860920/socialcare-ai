/**
 * ai-engine.js - 에러 출력 강제화 및 모델 목록 조회 버전
 */
export class AIEngine {
    constructor() {
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto".trim(); // 여기에 API 키를 꼭 넣으세요!
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
        } catch (e) {
            console.error("파일 로드 실패");
        }
    }

    async generateResponse(userInput, onChunk) {
        // 1.5 Flash 모델로 먼저 시도
        const modelName = "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

        const promptText = `너는 아동보호전문기관 업무 비서다. 아래 매뉴얼을 바탕으로 답변하라.
        [매뉴얼] ${this.localManualContent || "내용 없음"}
        질문: ${userInput}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const data = await response.json();

            // [핵심 수정] 에러 발생 시, 침묵하지 않고 화면에 즉시 출력합니다.
            if (!response.ok) {
                let errorMsg = `⛔ 연결 오류 (${response.status})\n`;
                
                if (response.status === 404) {
                    errorMsg += "모델을 찾을 수 없어 '사용 가능한 모델 목록'을 조회합니다...\n\n";
                    const listMsg = await this.checkAvailableModels();
                    errorMsg += listMsg;
                } else {
                    errorMsg += data.error ? data.error.message : "원인 불명";
                }

                if (onChunk) onChunk(errorMsg); // 화면에 강제 출력!
                return errorMsg;
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            }

        } catch (error) {
            const sysError = "⛔ 시스템 오류: " + error.message;
            if (onChunk) onChunk(sysError);
            return sysError;
        }
    }

    // 내 키로 쓸 수 있는 모델 목록을 구글에 직접 물어보는 함수
    async checkAvailableModels() {
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
            const response = await fetch(listUrl);
            const data = await response.json();

            if (data.models) {
                const myModels = data.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace("models/", ""))
                    .join("\n- "); // 보기 좋게 줄바꿈

                return `✅ 선생님 키로 사용 가능한 모델 목록:\n- ${myModels}\n\n(위 목록 중 하나를 골라 알려주시면 코드를 수정해 드립니다.)`;
            } else {
                return "⛔ 모델 목록 조회 실패. API 키가 올바른지, Google AI Studio에서 결제 설정(무료)이 되어 있는지 확인해 주세요.";
            }
        } catch (e) {
            return "⛔ 목록 조회 중 오류: " + e.message;
        }
    }
}
