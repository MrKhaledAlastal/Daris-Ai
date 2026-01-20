export type IntentType =
    | "concept"
    | "example"
    | "formula"
    | "calculation"
    | "result"
    | "followup";

export type IntentChunk = {
    type: IntentType;
    content: string;
};

const MARKER_PATTERN =
    /\[(Concept|Example|Formula|Calculation|Result|Followup)\]\s*([\s\S]*?)(?=\n?\[(?:Concept|Example|Formula|Calculation|Result|Followup)\]|$)/gi;

export const INTENT_MESSAGE_DELAY_MS = 600;

export function splitResponseIntoIntents(text: string): IntentChunk[] {
    if (!text) return [];

    const normalized = text.replace(/\r/g, "").trim();
    if (!normalized) return [];

    const regex = new RegExp(MARKER_PATTERN);
    const matches: IntentChunk[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalized)) !== null) {
        const [, label, body] = match;
        const type = label.toLowerCase() as IntentType;
        const content = body.trim();
        if (content) {
            matches.push({ type, content });
        }
    }
    if (!matches.length) {
        return [{ type: "concept", content: normalized }];
    }

    return matches;
}
