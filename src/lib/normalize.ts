export function normalizeQuestion(q: string) {
    return q
        .trim()
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()؟،]/g, "")
        .replace(/\s+/g, " ");
}
