// DEPRECATED: This file is no longer used.
// The project now uses Groq (src/ai/groq.ts) via src/ai/router.ts
// Keeping this file for reference only.

export async function askFlash(): Promise<string> {
  throw new Error("askFlash is deprecated. Use askAI from router.ts instead.");
}