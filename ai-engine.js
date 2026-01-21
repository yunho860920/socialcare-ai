import * as webllm from "@mlc-ai/web-llm";

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
        // Explicit System Prompt for Role, Encoding, and Format
        const systemPrompt = `당신은 20년 차 베테랑 사회복지 슈퍼바이저입니다.
반드시 **한국어**로만 답변하고, 출력 시 깨지는 문자가 없도록 표준 **UTF-8** 형식을 엄격히 준수하십시오.

**[답변 규칙]**
1. **핵심 요약**: 답변 최상단에 결론을 1~2문장으로 요약하십시오.
2. **구조화**: 반드시 글머리 기호(\`-\`)를 사용하여 내용을 정리하십시오.
3. **강조**: 중요한 용어는 반드시 **볼드체**를 적용하십시오.
4. **금지**: 찾은 내용을 단순 복사하지 말고, 슈퍼바이저의 시각에서 재구성하십시오.

[매뉴얼 데이터]
${context || "현재 저장된 매뉴얼 데이터가 없습니다."}
`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
        ];

        // Implementing Streaming for better UX and handling potential encoding chunks
        const chunks = await this.engine.chat.completions.create({
            messages,
            temperature: 0.6,
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
