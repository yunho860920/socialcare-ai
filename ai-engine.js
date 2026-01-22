import * as webllm from "@mlc-ai/web-llm";

/**
 * AI Engine: 사무실 PC 고사양 모델(8B) 및 로컬 파일/노션 통합 참조 모드
 */
export class AIEngine {
    constructor() {
        this.engine = null;
        // 사무실 PC 성능을 활용하기 위한 8B 모델로 업그레이드
        this.modelName = "Llama-3.1-8B-Instruct-q4f16_1-MLC"; 
        this.knowledgeBase = [];
        this.db = null;
        this.localManualContent = ""; // manual.txt 내용을 담을 변수
    }

    async initialize(onProgress) {
        this.db = await this.initDB();
        await this.loadLocalKnowledge();
        await this.fetchManualFile(); // 로컬 텍스트 파일 추가 로드

        this.engine = await webllm.CreateMLCEngine(this.modelName, {
            initProgressCallback: onProgress,
        });
    }

    // 로컬 manual.txt 파일을 읽어오는 함수 추가
    async fetchManualFile() {
        try {
            const response = await fetch('./manual.txt');
            if (response.ok) {
                this.localManualContent = await response.text();
                console.log("[FILE_CHECK] manual.txt 로드 성공");
            }
        } catch (e) {
            console.log("[FILE_CHECK] manual.txt를 찾을 수 없습니다.");
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("SocialCareDB", 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("manuals")) {
                    db.createObjectStore("manuals", { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async loadLocalKnowledge() {
        const transaction = this.db.transaction(["manuals"], "readonly");
        const store = transaction.objectStore("manuals");
        const request = store.getAll();
        request.onsuccess = () => {
            this.knowledgeBase = request.result;
            if (this.knowledgeBase.length > 0) {
                console.log(`[NOTION_CHECK] 노션 데이터 ${this.knowledgeBase.length}개 로드됨`);
            }
        };
    }

    async updateKnowledgeBase(data) {
        const transaction = this.db.transaction(["manuals"], "readwrite");
        const store = transaction.objectStore("manuals");
        store.clear();
        for (const item of data) {
            store.add(item);
        }
        this.knowledgeBase = data;
        console.log(`[NOTION_CHECK] 새 데이터 동기화 완료: ${data.length}건`);
    }

    /**
     * RAG 검색: 노션 데이터와 로컬 파일 데이터를 통합 검색
     */
    retrieveContext(query) {
        let combinedText = this.localManualContent + "\n";
        this.knowledgeBase.forEach(item => { combinedText += item.content + "\n"; });

        if (!combinedText.trim()) return null;

        const keywords = query.split(/\s+/).filter(w => w.length > 1);
        const sentences = combinedText.split(/[.!?\n]/).filter(s => s.trim().length > 5);

        const scored = sentences.map(s => {
            let score = 0;
            keywords.forEach(k => { if (s.includes(k)) score++; });
            return { sentence: s.trim(), score };
        }).filter(item => item.score > 0);

        const topSentences = scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 7) // 8B 모델은 더 긴 문맥을 읽을 수 있으므로 7개로 상향
            .map(item => item.sentence);

        return topSentences.length > 0 ? topSentences.join(". ") : null;
    }

    async generateResponse(userInput, onChunk) {
        if (!this.engine) throw new Error("AI Engine not initialized");

        const manualContext = this.retrieveContext(userInput);
        
        // 8B 모델 성능에 최적화된 시스템 프롬프트
        const systemPrompt = `너는 아동보호전문기관의 '연호 선생님'을 보좌하는 전문 AI 비서다.
반드시 한국어로만 답변하고, 제공된 [매뉴얼 데이터]를 가장 우선적인 근거로 삼아라.

**[응대 원칙]**
1. 답변 시작 시 반드시 **"[매뉴얼 기반 답변]"**이라고 머리말을 붙여라.
2. 매뉴얼에 관련 내용이 있다면 정확한 수치나 절차를 인용하라.
3. 매뉴얼에 없는 내용이라면 "매뉴얼 외 지식입니다:"라고 밝히고 답변하라.
4. 절대 영어나 외국어를 혼용하지 말고 단호하고 신뢰감 있는 한국어 문체를 사용하라.

[매뉴얼 데이터]
${manualContext || "참조할 매뉴얼 내용이 없습니다."}
`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
        ];

        const chunks = await this.engine.chat.completions.create({
            messages,
            temperature: 0.1, // 일관된 답변을 위해 낮게 설정
            stream: true
        });

        let fullText = "";
        for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                fullText += content;
                if (onChunk) onChunk(fullText);
            }
        }
        return fullText;
    }
}
