// DEPRECATED: Pro model is no longer used.
// The project now uses Groq Llama 3.1 via router.ts

import { askAI } from "./router";

export async function askPro(
  systemPrompt: string,
  question: string,
  history: any[] = []
): Promise<string> {
  return askAI({
    system: systemPrompt,
    question,
    history: history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
  });
}
