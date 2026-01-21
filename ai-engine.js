import * as webllm from "@mlc-ai/web-llm";

export class AIEngine {
    constructor() {
        this.engine = null;
        this.modelName = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
        this.knowledgeBase = [];
        this.db = null;
    }

    async initialize(onProgress) {
        // Initialize IndexedDB for knowledge base
        this.db = await this.initDB();
        await this.loadLocalKnowledge();

        // Initialize WebLLM Engine
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
    }

    /**
     * Simple RAG: Finds relevant manual snippets based on keyword matching.
     * In a production environment with Transformers.js, this would use vector embeddings.
     */
    retrieveContext(query) {
        if (this.knowledgeBase.length === 0) return "";

        // Very basic simple keyword search simulation for RAG
        const relevant = this.knowledgeBase.filter(item =>
            query.split(' ').some(word => item.content.includes(word))
        );

        return relevant.map(r => r.content).join("\n");
    }

    async generateResponse(userInput) {
        if (!this.engine) throw new Error("AI Engine not initialized");

        const context = this.retrieveContext(userInput);
        const systemPrompt = `당신은 20년 차 베테랑 사회복지 슈퍼바이저입니다. 
당신은 제공된 [매뉴얼 데이터]를 바탕으로 사회복지사에게 전문적인 조언을 제공해야 합니다.

**[답변 규칙]**
1. **핵심 요약**: 답변의 최상단에 결론이나 핵심 내용을 1~2문장으로 요약하여 제시하십시오.
2. **구조화된 상세 내용**: 반드시 글머리 기호(Bullet points, \`-\`)를 사용하여 내용을 구조화하십시오.
3. **강조**: 중요한 단어, 전문 용어, 숫자는 반드시 볼드체(\`**...**\`)를 적용하십시오.
4. **금지 사항**: 말끝을 "..."으로 흐리지 마십시오. 매뉴얼 내용을 단순 복사-붙여넣기 하지 말고, 현장 경험이 녹아든 조언으로 재구성하십시오.

[매뉴얼 데이터]
${context || "현재 저장된 매뉴얼 데이터가 없습니다."}
`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
        ];

        const chunks = await this.engine.chat.completions.create({
            messages,
            temperature: 0.7,
            stream: false // For simplicity, non-streaming in this demo
        });

        return chunks.choices[0].message.content;
    }
}
