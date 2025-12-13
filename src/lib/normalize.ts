/**
 * Normalize question for cache key generation
 * IMPORTANT: This creates a deterministic key for caching
 */
export function normalizeQuestion(q: string): string {
    return q
        .trim()
        .toLowerCase()
        // Remove Arabic diacritics (تشكيل)
        .replace(/[\u064B-\u065F\u0670]/g, "")
        // Remove punctuation
        .replace(/[.,/#!$%^&*;:{}=\-_`~()؟،?"']/g, "")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Generate a cache key that includes context
 * This prevents cache collisions between different branches
 */
export function generateCacheKey(
    question: string,
    branch?: string | null
): string {
    const normalized = normalizeQuestion(question);

    // Include branch in key to prevent cross-branch collisions
    const branchKey = branch ? branch.toLowerCase().trim() : "general";

    return `${branchKey}:${normalized}`;
}
