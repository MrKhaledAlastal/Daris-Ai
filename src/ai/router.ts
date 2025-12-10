import { askFlash } from "./flash";

export interface AskAIInput {
  question: string;
  system: string;
  history?: { role: "user" | "assistant"; content: string; imageBase64?: string }[];
  imageBase64?: string;
  pdfBase64?: string;
  useWebSearch?: boolean;
  jsonMode?: boolean;
}

export async function askAI({
  question,
  system,
  history = [],
  imageBase64,
  pdfBase64,
  useWebSearch,
  jsonMode = false,
}: AskAIInput): Promise<string> {

  // ✅ 1) sanitize history (لا نثق في assistant من العميل)
  const safeHistory = (history || [])
    .slice(-8)
    .map((m) => ({
      role: m.role === "assistant" ? "user" : m.role, // downgrade
      content: m.content,
      ...(m.imageBase64 ? { imageBase64: m.imageBase64 } : {}),
    }));

  // ✅ 2) لو jsonMode مفعّل، نضيف تذكير واضح في آخر السؤال نفسه
  let finalQuestion = question?.trim() || "";

  if (jsonMode) {
    finalQuestion += `

[IMPORTANT] You MUST respond with valid JSON only. No markdown, no extra text.
[مهم] يجب أن يكون الرد بصيغة JSON صحيحة فقط بدون أي نص خارج كائن JSON.`;
  }

  // ✅ 3) لو حابب تبقي على تعديل الـ system تبعك برضو ما في مشكلة
  let finalSystem = system;
  if (jsonMode) {
    finalSystem = `${system}

(REMINDER: Model must output ONLY valid JSON – no markdown, no prose outside JSON object.)`;
  }

  const pdfObject = pdfBase64
    ? { base64: pdfBase64, mime: "application/pdf" }
    : null;

  return askFlash(
    finalSystem,
    finalQuestion,
    safeHistory,
    imageBase64,
    pdfObject,
    useWebSearch,
    jsonMode
  );
}
