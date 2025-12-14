
import Groq from "groq-sdk";

const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
    console.warn("⚠️ GROQ_API_KEY is missing. AI features will fail.");
}

const groq = new Groq({
    apiKey: API_KEY,
});

// Enforcing Llama 3.3 as per architecture requirements
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

export class GroqTextProvider {
    async generateResponse({
        systemPrompt,
        question,
        history = [],
        temperature = 0.3,
        maxTokens = 4096,
    }: AskGroqOptions): Promise<string> {
        const messages: GroqMessage[] = [];

        // 1. Add System Prompt
        if (systemPrompt?.trim()) {
            messages.push({
                role: "system",
                content: systemPrompt.trim(),
            });
        }

        // 2. Add History
        for (const msg of history) {
            messages.push({
                role: msg.role,
                content: msg.content,
            });
        }

        // 3. Add User Question
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
                /*
                console.log(
                  `🚀 Groq Request (Llama 3.3) - Attempt ${attempt + 1
                  }/${MAX_RETRIES}`
                );
                */

                const response = await groq.chat.completions.create({
                    model: MODEL,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                });

                const text = response.choices[0]?.message?.content || "";
                return text;
            } catch (err: any) {
                console.error(
                    `❌ Groq Error (Attempt ${attempt + 1}):`,
                    err.message
                );

                if (err.status === 429 || err.message?.includes("429")) {
                    attempt++;
                    if (attempt < MAX_RETRIES) {
                        const waitTime = Math.pow(2, attempt) * 2000;
                        console.log(
                            `⏳ Rate limited. Waiting ${waitTime / 1000}s...`
                        );
                        await new Promise((r) => setTimeout(r, waitTime));
                        continue;
                    }
                }
                throw err;
            }
        }

        throw new Error("Max retries exceeded for Groq API");
    }
}

export const groqText = new GroqTextProvider();
