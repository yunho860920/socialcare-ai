/**
 * ai-engine.js - REBOOT 버전 (표준 모델, 키 분리)
 */
export class AIEngine {
    constructor(apiKey) {
        this.apiKey = apiKey; // 키는 외부에서 받습니다.
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

    async generateResponse(userInput, onChunk) {
        // [정밀 분석 결과] 가장 안정적인 'v1beta' 주소와 'gemini-1.5-flash' 조합
        // 실험용(exp)이나 구형(pro)보다 이게 현재 가장 확실합니다.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

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

            // [정밀 진단] 에러 발생 시 원인을 정확히 분석하여 한국어로 안내
            if (!response.ok) {
                let msg = data.error ? data.error.message : "알 수 없는 오류";
                
                if (msg.includes('API key not valid') || msg.includes('key expired')) {
                    return "⛔ [치명적 오류] API 키가 차단되었습니다. 깃허브에 키를 올리면 자동 차단됩니다. 새로고침 후 '새로운 키'를 입력해주세요.";
                }
                if (response.status === 404) {
                    return "⛔ [경로 오류] 모델을 찾을 수 없습니다. (gemini-1.5-flash)";
                }
                if (response.status === 429) {
                    return "⛔ [사용량 초과] 무료 사용량이 일시적으로 찼습니다. 1분 뒤에 시도해주세요.";
                }
                
                throw new Error(msg);
            }

            if (data.candidates && data.candidates.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (onChunk) onChunk(text);
                return text;
            } else {
                return "답변 내용이 없습니다.";
            }

        } catch (error) {
            const errorText = "시스템 오류: " + error.message;
            if (onChunk) onChunk(errorText);
            return errorText;
        }
    }
}
