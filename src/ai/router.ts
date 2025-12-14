
// src/ai/router.ts
// Central Hub for AI Operations
// Coordinates between Vision (Gemini) and Text (Groq) providers

import { groqText } from "./providers/groq-text";
import { geminiVision } from "./providers/gemini-vision";

export interface AskAIInput {
  question: string;
  system: string;
  history?: { role: "user" | "assistant"; content: string }[];
  jsonMode?: boolean;
  imageBase64?: string;
  pdfBase64?: string;
}

/**
 * Direct interface to Groq for text generation.
 * Handles JSON mode if requested.
 * Automatically handles Vision extraction if image/pdf is provided.
 */
export async function askAI({
  question,
  system,
  history = [],
  jsonMode = false,
  imageBase64,
  pdfBase64
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

  // Vision Processing
  let visionContext = "";
  if (imageBase64) {
    try {
      const text = await extractTextFromMedia(imageBase64, "image/jpeg");
      visionContext += `\n\n[CONTEXT FROM IMAGE]:\n${text}\n`;
    } catch (e) {
      console.error("Auto Vision Extraction Failed:", e);
    }
  }

  // Note: For now assuming pdfBase64 is passed as pure base64. 
  // Ideally mimetype should be passed, but default to 'application/pdf' if variable name suggests PDF.
  if (pdfBase64) {
    try {
      const text = await extractTextFromMedia(pdfBase64, "application/pdf");
      visionContext += `\n\n[CONTEXT FROM PDF]:\n${text}\n`;
    } catch (e) {
      console.error("Auto Vision Extraction Failed:", e);
    }
  }

  // Build system
  let finalSystem = system;

  if (visionContext) {
    finalSystem += `\n\n=== ATTACHED MEDIA FLUID CONTENT ===\n${visionContext}\n====================================\n`;
  }

  if (jsonMode) {
    finalSystem += "\n\n(تذكير: أجب بصيغة JSON صحيحة فقط)";
  }

  const response = await groqText.generateResponse({
    systemPrompt: finalSystem,
    question: finalQuestion,
    history: safeHistory,
    temperature: 0.3,
    maxTokens: 4096,
  });

  if (jsonMode) {
    // Basic JSON extraction
    let cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    if (cleaned.startsWith('`')) cleaned = cleaned.replace(/`/g, ''); // Extra cleanup

    // Look for brace patterns
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch { }
    }
    // Fallback if parsing fails
    return JSON.stringify({ answer: response, citations: [] });
  }

  return response;
}

/**
 * Extracts text from an image or PDF using the configured Vision Provider.
 */
export async function extractTextFromMedia(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  // Simple validation to ensure we don't send huge empty payloads
  if (!base64Data || base64Data.length < 100) {
    return "";
  }

  console.log(`👁️ Vision Request: Extracting text from ${mimeType}...`);
  try {
    const text = await geminiVision.extractText(base64Data, mimeType);
    console.log("✅ Vision Extraction Complete");
    return text;
  } catch (err) {
    console.error("❌ Vision Extraction Failed:", err);
    // Return empty string on failure to allow text-only fallback
    return "";
  }
}
