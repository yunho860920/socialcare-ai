import * as webllm from "@mlc-ai/web-llm";

/**
 * AI Engine: Optimized for Korean-only, low-latency, and Precise RAG.
 */
export class AIEngine {
    constructor() {
        this.engine = null;
        this.modelName = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
        this.knowledgeBase = [];
        this.db = null;
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
            if (this.knowledgeBase.length > 0) {
                const preview = this.knowledgeBase[0].content.substring(0, 100);
                console.log(`[NOTION_CHECK] First entry preview: ${preview}`);
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

        // Log the first 100 chars as requested
        if (data.length > 0) {
            const logContent = data[0].content.substring(0, 100);
            console.log(`[NOTION_CHECK] Data Received: ${logContent}`);
        }
    }

    /**
     * Mini-Search RAG: Selects only top 3-5 relevant sentences to save context and prevent hallucination.
     */
    retrieveContext(query) {
        if (this.knowledgeBase.length === 0) return null;

        const keywords = query.split(/\s+/).filter(w => w.length > 1);

        // Flatten all manual content into sentences
        let allSentences = [];
        this.knowledgeBase.forEach(item => {
            const sentences = item.content.split(/[.!?\n]/).filter(s => s.trim().length > 5);
            allSentences = allSentences.concat(sentences);
        });

        // Score sentences based on keyword overlap
        const scored = allSentences.map(s => {
            let score = 0;
            keywords.forEach(k => { if (s.includes(k)) score++; });
            return { sentence: s.trim(), score };
        }).filter(item => item.score > 0);

        // Sort by relevance and pick top 5
        const topSentences = scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.sentence);

        return topSentences.length > 0 ? topSentences.join(". ") : null;
    }

    async generateResponse(userInput, onChunk) {
        if (!this.engine) throw new Error("AI Engine not initialized");

        const manualContext = this.retrieveContext(userInput);

        let contextSection = "";
        if (manualContext) {
            contextSection = `[노션 매뉴얼 데이터]\n${manualContext}`;
        } else {
            contextSection = "매뉴얼 데이터를 불러오지 못했습니다.";
        }

        const systemPrompt = `너는 아동보호전문기관(CPS)의 '연호 선생님'을 돕는 한국어 전용 AI 비서다.
**영어, 베트남어, 한자를 절대 섞지 말고 표준 한국어만 사용하라.**

**[응대 원칙]**
1. 매뉴얼 데이터가 있다면 반드시 **"노션 매뉴얼 확인 결과:"**라고 답변을 시작하라.
2. 매뉴얼 데이터가 없다면 **"매뉴얼 데이터를 불러오지 못했습니다."**라고 먼저 말한 뒤 아는 선에서 조언하라.
3. 아동학대 대응 전문가로서 전문적이고 단호하면서도 친절한 한국어 문체를 유지하라.
4. 환각 증세 없이, 오직 주어진 매뉴얼과 상식에 기반해 한국어로만 짧고 명확하게 답변하라.

${contextSection}
`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
        ];

        const chunks = await this.engine.chat.completions.create({
            messages,
            temperature: 0.1, // Fixed for high determinism
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
