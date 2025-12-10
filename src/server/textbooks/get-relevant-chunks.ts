import { supabase } from "@/lib/supabase";

export async function getRelevantChunks(question: string, branch: string, limit = 5) {

    // 1) احصل على embedding للسؤال
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "text-embedding-3-small",
            input: question,
        }),
    }).then(r => r.json());

    const queryEmbedding = embeddingRes.data[0].embedding;

    // 2) ابحث في Supabase
    const { data, error } = await supabase.rpc("match_pages", {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: limit,
        branch_name: branch
    });

    if (error) {
        console.error("RAG error:", error);
        return [];
    }

    return data || [];
}
