// src/lib/embeddings.ts
// Using OpenAI text-embedding-3-small for RAG
// Requires OPENAI_API_KEY in .env

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function generateEmbedding(text: string): Promise<number[]> {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required for embeddings");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: text,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI Embedding Error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
        throw new Error("Invalid embedding response");
    }

    return embedding;
}
