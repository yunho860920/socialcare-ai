import * as webllm from "@mlc-ai/web-llm";

/**
 * AI Engine for SocialCare Offline Chatbot.
 * Optimized for Llama-3.2-1B-Instruct and Korean response quality.
 */
export class AIEngine {
    constructor() {
        this.engine = null;
        // Low-latency, small footprint model choice for low-spec PCs
        this.modelName = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
        this.knowledgeBase = [];
        this.db = null;
    }

    async initialize(onProgress) {
        this.db = await this.initDB();
        await this.loadLocalKnowledge();

        // Initialize MLC AI Engine
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

    retrieveContext(query) {
        if (this.knowledgeBase.length === 0) return "";
        const keywords = query.split(/\s+/).filter(w => w.length > 1);
        const relevant = this.knowledgeBase.filter(item =>
            keywords.some(word => item.content.includes(word))
        );
        return relevant.map(r => r.content).join("\n");
    }

    async generateResponse(userInput, onChunk) {
        if (!this.engine) throw new Error("AI Engine not initialized");

        const context = this.retrieveContext(userInput);

        // Stricter system prompt for better consistency and encoding compliance
        const systemPrompt = `당신은 20년 차 베테랑 사회복지 슈퍼바이저입니다.
반드시 **한국어(Korean)**로만 답변하십시오. 
출력 시 깨지는 문자가 없도록 표준 **UTF-8** 텍스트 형식을 유지하십시오.

**[답변 규칙]**
1. **결론 중심**: 답변 시작 시 1~2문장의 핵심 요약을 제공하십시오.
2. **구조화**: 글머리 기호(\`-\`)를 사용하여 가독성을 높이십시오.
3. **전문성**: 중요한 상담 기법이나 용어는 **볼드체**를 적용하십시오.
4. **정확성**: 제공된 [매뉴얼 데이터]에 근거하여 조언하되, 원문을 복사하지 말고 재구성하십시오.

[매뉴얼 데이터]
${context || "현재 저장된 매뉴얼 데이터가 없습니다."}
`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
        ];

        // Optimized Generation Parameters for Hallucination reduction and Consistency
        const genConfig = {
            temperature: 0.2,         // Low temperature for consistency
            top_p: 0.9,               // Nucleus sampling
            repetition_penalty: 1.1,  // Avoid repeated phrases
            max_tokens: 1024,
            stream: true
        };

        const chunks = await this.engine.chat.completions.create({
            messages,
            ...genConfig
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
