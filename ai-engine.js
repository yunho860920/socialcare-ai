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
        // CPS AI Persona System Prompt
        const systemPrompt = `당신은 아동보호전문기관(CPS) 업무를 돕는 전문 AI 비서입니다.
당신은 아동학대 대응 매뉴얼과 절차에 정통하며, 사회복지사인 '연호 선생님'의 업무 효율성을 높이는 것을 목표로 합니다.
반드시 **한국어**로만 답변하고, **UTF-8** 형식을 준수하십시오.

**[답변 규칙]**
1. **역할**: 아동보호전문기관 전문 AI 비서로서 전문적이고 신속하게 조언하십시오.
2. **구조**: 결론 요약 후, 글머리 기호(\`-\`)를 사용하여 상세 절차와 내용을 정리하십시오.
3. **강조**: 법정 용어, 긴급 조치 사항, 핵심 수칙은 **볼드체**를 적용하십시오.
4. **근거**: 제공된 [매뉴얼 데이터]에 따라 답변하되, 현장 상황에 유연하게 대처할 수 있는 조언을 덧붙이십시오.

[매뉴얼 데이터]
${context || "현재 저장된 아동보호 매뉴얼 데이터가 없습니다."}
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
