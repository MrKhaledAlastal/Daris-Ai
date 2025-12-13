// src/ai/groq.ts
// Groq client using Llama 3.3 ONLY
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ENFORCED: Llama 3.3 only
const MODEL = "llama-3.3-70b-versatile";

export interface GroqMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AskGroqOptions {
    systemPrompt: string;
    question: string;
    history?: { role: "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
}

export async function askGroq({
    systemPrompt,
    question,
    history = [],
    temperature = 0.3, // Lower for more deterministic answers
    maxTokens = 4096,
}: AskGroqOptions): Promise<string> {
    const messages: GroqMessage[] = [];

    if (systemPrompt?.trim()) {
        messages.push({
            role: "system",
            content: systemPrompt.trim(),
        });
    }

    for (const msg of history) {
        messages.push({
            role: msg.role,
            content: msg.content,
        });
    }

    if (question?.trim()) {
        messages.push({
            role: "user",
            content: question.trim(),
        });
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            console.log(`🚀 Groq Request (Llama 3.3) - Attempt ${attempt + 1}/${MAX_RETRIES}`);

            const response = await groq.chat.completions.create({
                model: MODEL,
                messages,
                temperature,
                max_tokens: maxTokens,
            });

            const text = response.choices[0]?.message?.content || "";
            console.log("✅ Groq Response received");
            return text;

        } catch (err: any) {
            console.error(`❌ Groq Error (Attempt ${attempt + 1}):`, err.message);

            if (err.status === 429 || err.message?.includes("429")) {
                attempt++;
                if (attempt < MAX_RETRIES) {
                    const waitTime = Math.pow(2, attempt) * 2000;
                    console.log(`⏳ Rate limited. Waiting ${waitTime / 1000}s...`);
                    await new Promise((r) => setTimeout(r, waitTime));
                    continue;
                }
            }
            throw err;
        }
    }

    throw new Error("Max retries exceeded for Groq API");
}
