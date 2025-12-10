import { supabase } from "@/lib/supabase";
import { normalizeQuestion } from "./normalize";

// ===============================
// 1. GET from cache
// ===============================
export async function getCachedAnswer(question: string) {
    const normalized = normalizeQuestion(question);

    const { data, error } = await supabase
        .from("cache")
        .select("*")
        .eq("normalized_question", normalized)
        .limit(1)
        .single();

    if (error || !data) return null;

    return {
        answer: data.answer,
        book_id: data.book_id,
        created_at: data.created_at,
    };
}

// ===============================
// 2. SAVE to cache (نسخة object) ✅
// ===============================
export async function saveAnswerToCache({
    question,
    answer,
    book_id = null,
}: {
    question: string;
    answer: string;
    book_id?: string | null;
}) {
    const normalized = normalizeQuestion(question);

    const { error } = await supabase.from("cache").insert({
        question,
        normalized_question: normalized,
        answer,
        book_id,
    });

    if (error) console.error("Cache Insert Error:", error);
}
