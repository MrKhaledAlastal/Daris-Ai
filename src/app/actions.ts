"use server";

import { answerStudyQuestion } from "@/ai/flows/answer-study-questions";
import { processUploadedFile } from "@/ai/file-utils";

// =========================================================
// Helper: Detect Language from Text
// =========================================================
function detectLanguage(text: string): "ar" | "en" {
  if (!text || text.trim().length === 0) return "ar";
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text) ? "ar" : "en";
}

export async function askQuestionAction({
  question,
  expandSearchOnline,
  language,
  userId,
  chatId,
  imageBase64,
  fileBase64,
  fileMimeType,
  fileName,
  history,
  branch // New param
}: {
  question: string;
  expandSearchOnline: boolean;
  language: string;
  userId: string;
  chatId: string;
  imageBase64?: string;
  fileBase64?: string;
  fileMimeType?: string;
  fileName?: string;
  history: any[];
  branch?: string | null;
}) {

  console.log("🚀 SERVER ACTION RECEIVED:");
  console.log("QUESTION:", question);
  console.log("BRANCH:", branch);
  console.log("WEB SEARCH:", expandSearchOnline);

  const detectedLanguage = detectLanguage(question);

  let finalQuestion = question;
  let imageForAI = imageBase64;

  // Process file if present (simplified logic for now, as answerStudyQuestion handles text content)
  // If we have a file, we might want to extract text here or pass it to the flow.
  // For now, let's keep the existing file processing logic but adapt it.

  let textbookContent: string | undefined = "";  // ✅
  if (fileBase64 && fileMimeType) {
    const processed = await processUploadedFile(fileBase64 ?? "", fileMimeType ?? "");

    if (processed.type === "text") {
      textbookContent = processed.text;
      const prefix = detectedLanguage === "ar"
        ? "\n\n[محتوى من ملف مرفق]:\n"
        : "\n\n[Content from attached file]:\n";
      finalQuestion = (finalQuestion || "") + prefix + processed.text;
    } else if (processed.type === "image") {
      imageForAI = imageForAI || `data:${processed.mime};base64,${processed.base64}`;
    }
    // PDF handling is tricky here because answerStudyQuestion expects text content or book IDs.
    // If it's a new file upload in chat, we might treat it as context text.
  }

  // Call the Flow
  const result = await answerStudyQuestion({
    question: finalQuestion,
    textbookContent: textbookContent || undefined,  // ✅
    availableBooks: [], // We rely on 'branch' to fetch books in the flow
    expandSearchOnline,
    language: detectedLanguage,
    branch: branch ?? undefined,  // ✅ استخدم ?? بدل ||
    imageBase64: imageForAI,
    history: history.map((h: any) => ({
      role: h.role,
      content: h.content,
      imageBase64: h.imageBase64
    }))
  });

  return {
    answer: result.answer,
    source: result.source,
    sourceBookName: result.sourceBookName,
    sourcePageNumber: result.sourcePageNumber,
    lang: result.lang,
  };
}