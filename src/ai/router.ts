// src/ai/router.ts
// Routes all AI requests through Groq (Llama 3.3)

import { askGroq } from "./groq";

export interface AskAIInput {
  question: string;
  system: string;
  history?: { role: "user" | "assistant"; content: string }[];
  imageBase64?: string;
  pdfBase64?: string;
  useWebSearch?: boolean;
  jsonMode?: boolean;
}

export async function askAI({
  question,
  system,
  history = [],
  jsonMode = false,
}: AskAIInput): Promise<string> {

  // Sanitize history
  const safeHistory = (history || [])
    .slice(-8)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Build question
  let finalQuestion = question?.trim() || "";

  if (jsonMode) {
    finalQuestion += "\n\n[أجب بصيغة JSON فقط]";
  }

  // Build system
  let finalSystem = system;
  if (jsonMode) {
    finalSystem += "\n\n(تذكير: أجب بصيغة JSON صحيحة فقط)";
  }

  const response = await askGroq({
    systemPrompt: finalSystem,
    question: finalQuestion,
    history: safeHistory,
    temperature: 0.3,
    maxTokens: 4096,
  });

  if (jsonMode) {
    let cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch { }
    }
    return JSON.stringify({ answer: response, citations: [] });
  }

  return response;
}
