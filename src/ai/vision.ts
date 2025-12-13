// DEPRECATED: Vision is now handled via router.ts
// Groq Llama 3.1 doesn't support vision, so images are handled as text descriptions

import { askAI } from "./router";

export async function askVision(
  systemPrompt: string,
  question: string,
  imageBase64?: string,
  pdfBase64?: string
): Promise<string> {
  return askAI({
    system: systemPrompt,
    question,
    imageBase64,
    pdfBase64,
  });
}