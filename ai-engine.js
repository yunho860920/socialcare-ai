import * as webllm from "@mlc-ai/web-llm";

/**
 * AI Engine for SocialCare Offline Chatbot.
 * Focus: Robust RAG prioritization and memory stability.
 */
export class AIEngine {
    constructor() {
        this.engine = null;
        this.modelName = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
        this.knowledgeBase = [];
        this.db = null;
        this.maxContextLength = 1500; // Limit manual context to prevent memory issues
    }

    async initialize(onProgress) {
        this.db = await this.initDB();
        await this.loadLocalKnowledge();

        this.engine = await webllm.CreateMLCEngine(this.modelName, {
            initProgressCallback: onProgress,
        });
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

        // [SUCCESS LOG] Added as requested by user
        console.log(`[SUCCESS] Notion Data Loaded:`, data);
    }

    /**
     * Enhanced Retrieval: prioritizes relevant snippets and truncates to avoid memory errors.
     */
    retrieveContext(query) {
        if (this.knowledgeBase.length === 0) return "";

        const keywords = query.split(/\s+/).filter(w => w.length > 1);
        let relevant = this.knowledgeBase.filter(item =>
            keywords.some(word => item.content.includes(word))
        );

        // Fallback to most recent manual entries if no keyword match
        if (relevant.length === 0) {
            relevant = this.knowledgeBase.slice(-2);
        }

        let combined = relevant.map(r => r.content).join("\n\n");

        // Truncate logic for stability on low-spec PCs
        if (combined.length > this.maxContextLength) {
            combined = combined.substring(0, this.maxContextLength) + "... (이후 내용 생략)";
        }

        return combined;
    }

    async generateResponse(userInput, onChunk) {
        if (!this.engine) throw new Error("AI Engine not initialized");

        const manualData = this.retrieveContext(userInput);

        // STRENGTHENED RAG SYSTEM PROMPT
        const systemPrompt = `당신은 아동보호전문기관(CPS)의 '연호 선생님'을 돕는 전문 AI 비서입니다.

**[최우선 원칙]**
1. 당신은 반드시 제공된 **[노션 매뉴얼 데이터]**를 가장 먼저 참조하여 답변해야 합니다.
2. 답변을 시작할 때, 매뉴얼에 해당 내용이 있다면 반드시 **"노션 매뉴얼 확인 결과,"** 또는 **"데이터베이스에 명시된 지침에 따르면,"**과 같이 출처를 밝히십시오.
3. 매뉴얼에 없는 내용에 대해 답변할 때는 "현재 매뉴얼에는 없지만, 일반적인 대응 절차로는..."이라고 조언하십시오.

**[답변 형식]**
- 역할: 전문적이고 신뢰감 있는 아동학대 대응 전문가.
- 언어: 반드시 **한국어**로만 답변.
- 강조: 법률 조항, 신고 번호, 긴급 조치 사항은 **볼드체** 적용.
- 구조: 결론부터 말하고 상세 내용은 글머리 기호(\`-\`)를 사용.

[노션 매뉴얼 데이터]
${manualData || "현재 동기화된 노션 매뉴얼 데이터가 없습니다. 매뉴얼 확인이 불가능합니다."}
`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
        ];

        const chunks = await this.engine.chat.completions.create({
            messages,
            temperature: 0.1, // Highly deterministic for manual lookup
            top_p: 1.0,
            repetition_penalty: 1.2,
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
