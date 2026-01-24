import { supabase } from "@/lib/supabase";
import { generateCacheKey, normalizeQuestion } from "./normalize";
//
// ===============================
// GET from cache
// ===============================
export async function getCachedAnswer(
    question: string,
    branch?: string | null
): Promise<{
    answer: string;
    book_id: string | null;
    created_at: string;
} | null> {
    const cacheKey = generateCacheKey(question, branch);

    const { data, error } = await supabase
        .from("cache")
        .select("*")
        .eq("cache_key", cacheKey)
        .limit(1)
        .single();

    if (error || !data) return null;

    console.log("✅ Cache HIT:", cacheKey.substring(0, 50));

    return {
        answer: data.answer,
        book_id: data.book_id,
        created_at: data.created_at,
    };
}

// ===============================
// SAVE to cache
// ===============================
export async function saveAnswerToCache({
    question,
    answer,
    branch = null,
    book_id = null,
}: {
    question: string;
    answer: string;
    branch?: string | null;
    book_id?: string | null;
}): Promise<void> {
    const cacheKey = generateCacheKey(question, branch);
    const normalized = normalizeQuestion(question);

    // Upsert: Update if exists, insert if not
    const { error } = await supabase.from("cache").upsert(
        {
            cache_key: cacheKey,
            question,
            normalized_question: normalized,
            branch,
            answer,
            book_id,
            updated_at: new Date().toISOString(),
        },
        {
            onConflict: "cache_key",
        }
    );

    if (error) {
        console.error("❌ Cache Insert Error:", error);
    } else {
        console.log("✅ Cache SAVED:", cacheKey.substring(0, 50));
    }
}

// ===============================
// INVALIDATE cache (optional utility)
// ===============================
export async function invalidateCache(cacheKey: string): Promise<void> {
    const { error } = await supabase
        .from("cache")
        .delete()
        .eq("cache_key", cacheKey);

    if (error) {
        console.error("❌ Cache Invalidate Error:", error);
    }
}
