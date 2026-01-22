/**
 * ai-engine.js - 모델 자가 진단 및 목록 확인 버전
 */
export class AIEngine {
    constructor() {
        this.apiKey = "AIzaSyBVjs6XIu2ciVm0nNMplsoPVrzDGllvRto".trim(); // 키 입력 필수!
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
        // 일단 가장 최신 버전(v1beta)의 1.5-flash 모델로 시도해 봅니다.
        const modelName = "gemini-1.5-flash";
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
            
            // [핵심] 만약 404 에러가 나면, 사용 가능한 모델 목록을 조회합니다.
            if (!response.ok) {
                if (response.status === 404) {
                    return await this.checkAvailableModels();
                }
                throw new Error(data.error ? data.error.message : "알 수 없는 오류");
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            } else {
                return "답변을 생성하지 못했습니다.";
            }

        } catch (error) {
            return "⛔ 오류 발생: " + error.message;
        }
    }

    // [자가 진단 함수] 내 키로 쓸 수 있는 모델이 뭔지 구글에 물어봅니다.
    async checkAvailableModels() {
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
            const response = await fetch(listUrl);
            const data = await response.json();
            
            if (data.models) {
                // 'generateContent' 기능을 지원하는 모델만 추려냅니다.
                const chatModels = data.models
                    .filter(m => m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace("models/", "")) // "models/" 글자 제거
                    .join(", ");
                
                return `🚨 [모델 불일치] 현재 설정된 모델을 찾을 수 없습니다.\n\n✅ 선생님의 키로 사용 가능한 모델 목록:\n${chatModels}\n\n위 목록 중 하나를 골라 코드의 'modelName'을 수정해주세요.`;
            } else {
                return "⛔ 모델 목록을 불러올 수 없습니다. API 키가 올바른지 다시 확인해주세요.";
            }
        } catch (e) {
            return "⛔ 모델 확인 중 오류 발생: " + e.message;
        }
    }
}
