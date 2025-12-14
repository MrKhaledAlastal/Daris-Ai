'use server';

import { askAI, extractTextFromMedia } from '@/ai/router';
import { z } from 'zod';
import { getCachedAnswer, saveAnswerToCache } from "@/lib/cache";

/* ======================= Types ======================= */

const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  imageBase64: z.string().nullable().optional(),
});

const AnswerStudyQuestionInputSchema = z.object({
  question: z.string(),
  textbookContent: z.string().optional(),
  availableBooks: z.array(z.object({ id: z.string(), fileName: z.string() })).optional(),
  expandSearchOnline: z.boolean(),
  language: z.enum(['en', 'ar']).optional(),
  branch: z.string().optional(),
  imageBase64: z.string().optional(),
  fileBase64: z.string().optional(), // Added for PDF support
  fileMimeType: z.string().optional(), // Added for PDF support
  history: z.array(HistoryMessageSchema).optional(),
});

export type AnswerStudyQuestionInput = z.infer<typeof AnswerStudyQuestionInputSchema>;

export interface AnswerStudyQuestionOutput {
  answer: string;
  source: string;
  sourceBookName?: string;
  sourcePageNumber?: number;
  lang: 'en' | 'ar';
}

/* ======================= Constants ======================= */

const NO_ANSWER_RESPONSE_AR = "لا يوجد جواب لهذا السؤال في الصفحات المتاحة من الكتاب.";
const NO_ANSWER_RESPONSE_EN = "No answer found for this question in the available textbook pages.";

/* ======================= Main Function ======================= */

export async function answerStudyQuestion(
  input: AnswerStudyQuestionInput
): Promise<AnswerStudyQuestionOutput> {
  console.log("📚 answerStudyQuestion:", {
    question: input.question?.substring(0, 50),
    branch: input.branch,
    webSearch: input.expandSearchOnline,
    hasImage: !!input.imageBase64,
    hasFile: !!input.fileBase64
  });

  /* ------------------ Vision Processing (OCR) ------------------ */
  // Step 1: Extract text if image or PDF is present
  let extractedContext = "";

  if (input.imageBase64) {
    try {
      console.log("🖼️ Processing Image...");
      // Assuming JPEG for simple base64 images passed this way, or detect from header if possible
      extractedContext = await extractTextFromMedia(input.imageBase64, "image/jpeg");
      console.log("✅ Image Text Extracted:", extractedContext.substring(0, 50) + "...");
    } catch (e) {
      console.error("❌ Image Extraction Failed:", e);
    }
  } else if (input.fileBase64 && input.fileMimeType) {
    try {
      console.log(`Bm Processing File (${input.fileMimeType})...`);
      extractedContext = await extractTextFromMedia(input.fileBase64, input.fileMimeType);
      console.log("✅ File Text Extracted:", extractedContext.substring(0, 50) + "...");
    } catch (e) {
      console.error("❌ File Extraction Failed:", e);
    }
  }

  // Combine Question + Extracted Text for RAG
  let queryForRAG = input.question;
  if (extractedContext) {
    queryForRAG = `${input.question}\n\n[SIA Context from Image/File]:\n${extractedContext}`;
  }

  const lang: 'ar' | 'en' = input.language || (/[\u0600-\u06FF]/.test(queryForRAG) ? 'ar' : 'en');

  /* ------------------ Cache Check ------------------ */
  // Append mode suffix to separate 'Strict' answers from 'Web' answers in cache
  const modeSuffix = input.expandSearchOnline ? "[WEB]" : "[STRICT]";
  const cacheQuery = `${queryForRAG} ${modeSuffix}`;

  const cached = await getCachedAnswer(cacheQuery, input.branch);
  if (cached) {
    console.log("✅ Cache HIT");
    return {
      answer: cached.answer,
      source: "cache",
      lang,
    };
  }

  /* ------------------ Fetch Books ------------------ */
  let booksForContext = input.availableBooks || [];
  const bookIdToName: Record<string, string> = {};

  if (booksForContext.length === 0 && input.branch) {
    try {
      const { supabaseAdmin } = await import("@/lib/supabase-admin");
      const { data } = await supabaseAdmin
        .from("books")
        .select("id, file_name")
        .eq("branch", input.branch)
        .eq("status", "analyzed");

      if (data) {
        booksForContext = data.map((b: any) => {
          bookIdToName[b.id] = b.file_name;
          return { id: b.id, fileName: b.file_name };
        });
      }
    } catch (err) {
      console.error("Book fetch error:", err);
    }
  } else {
    booksForContext.forEach(b => { bookIdToName[b.id] = b.fileName; });
  }

  /* ------------------ RAG Retrieval ------------------ */

  let context = "";
  let retrievedChunks: any[] = [];
  let sourceInfo: { bookName: string; pageNumber: number } | null = null;

  // ALWAYS retrieve from books if available (whether web search is on or off)
  if (booksForContext.length > 0) {
    try {
      const { supabaseAdmin } = await import("@/lib/supabase-admin");

      // Use the queryForRAG (includes OCR text)
      const { data, error } = await supabaseAdmin.rpc(
        "match_book_pages_text",
        {
          query_text: queryForRAG,
          match_count: 20,
        }
      );

      if (error) {
        console.error("❌ RAG RPC Error:", error);
      } else if (data && data.length > 0) {
        retrievedChunks = data;

        sourceInfo = {
          bookName: bookIdToName[data[0].book_id] || "كتاب",
          pageNumber: data[0].page_number,
        };

        context = data
          .map(
            (p: any) =>
              `[صفحة ${p.page_number}]\n${p.content}`
          )
          .join("\n\n");

        console.log(`✅ RAG: ${data.length} chunks retrieved`);
      } else {
        console.log("⚠️ No chunks found");
      }
    } catch (err) {
      console.error("❌ RAG Error:", err);
    }
  }

  /* ==================== BUILD SYSTEM PROMPT ==================== */

  let systemPrompt: string;

  if (input.expandSearchOnline) {
    // 🌐 WEB SEARCH MODE (Expanded Knowledge)
    // Philosophy: Use books first, but allow general knowledge to expand/explain.

    systemPrompt = `أنت "توجيهي AI" - مساعد تعليمي ذكي لطلاب الثانوية العامة الفلسطينية.

## الوضع الحالي: البحث الموسّع (Web Search) ✅

## التعليمات:
1. استخدم **محتوى الكتب** أدناه كمصدر أساسي إن وُجد.
2. استخدم **معرفتك العامة** لتوسيع الشرح أو الإجابة إذا لم يكن المحتوى كافياً.
3. إذا كان سؤال المستخدم **دردشة أو ترحيب** (كيفك؟ مرحبا)، أجب بطبيعية كصديق.

## قواعد التوثيق:
- إذا كانت المعلومة من الكتاب، اذكر المصدر (رقم الصفحة).
- إذا كانت شرحاً عاماً، وضح ذلك.

## المحتوى المتاح من الكتب:
${context ? context : "(لا يوجد محتوى مطابق في الكتب الحالية)"}

## محتوى الصورة/الملف المرفق:
${extractedContext ? extractedContext : "(لا يوجد)"}

## المصادر المطلوبة:
في نهاية الإجابة، أضف قسماً للمصادر يوضح ما إذا كانت المعلومات من الكتاب أو معرفة عامة.
`;

  } else {
    // 📚 STRICT STUDY MODE (Automatic Detection / Textbook Only)
    // Philosophy: "Study Context" -> Strict adherence to book. "Natural Chat" -> Friendly.

    // Core Prompt Strategy:
    // We instruct the AI to SELF-CLASSIFY the intent (Chat vs Study).
    // - Chat: Answer freely.
    // - Study: Answer ONLY from context. If No Context -> Deny.

    systemPrompt = `أنت "توجيهي AI" - مساعد تعليمي لطلاب التوجيهي.

## فلسفة العمل (قواعد صارمة جداً):
عليك تحديد نية المستخدم تلقائياً واتباع "المسار" المناسب أدناه:

🔴 **المسار 1: الدردشة الطبيعية (Natural Chat)**
- **متى؟** إذا كان كلام المستخدم: ترحيب (مرحبا، كيفك)، سؤال عن حالك، مزاح، شكر، أو كلام عادي غير دراسي.
- **التصرف:** أجب بحرية تامة وطبيعية كأنك إنسان. (لا تذكر كتب، لا تذكر مصادر، لا ترفض).

🔵 **المسار 2: السياق الدراسي (Study Context)**
- **متى؟** إذا كان السؤال: عن مادة دراسية، شرح قانون، تعريف، حل مسألة، أو يحتوي ملفاً تعليمياً.
- **التصرف (وضع الكتاب فقط):**
   1. **الإجابة حصرياً** مما ورد في "محتوى الكتب المتاح" أدناه.
   2. يمنع منعاً باتاً استخدام معلومات خارجية أو معرفة عامة.
   3. عند ذكر معلومة، ضع رقم الصفحة: (صفحة X).
   4. **إذا لم تجد الإجابة في المحتوى أدناه**:
      أجب بهذه الجملة فقط وحرفياً:
      "${NO_ANSWER_RESPONSE_AR}"
      (ممنوع الشرح، ممنوع التخمين، ممنوع إعطاء بدائل).

## محتوى الكتب المتاح (Study Context Only):
${context ? context : "(لا يوجد محتوى)"}

## محتوى الصورة/الملف المرفق:
${extractedContext}

## المصادر (مطلوب فقط للمسار الدراسي):
في نهاية الإجابة الدراسية، يجب ذكر:
---
المصادر:
- كتاب: [اسم الكتاب] | صفحة: [رقم]
`;
  }

  /* ------------------ History ------------------ */
  const rawHistory = (input.history ?? []).slice(-6).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  /* ------------------ Call AI (Groq) ------------------ */
  let modelOutput: string;

  try {
    modelOutput = await askAI({
      question: input.question,
      system: systemPrompt,
      history: rawHistory,
    });
  } catch (err: any) {
    console.error("AI Error:", err);
    return {
      answer: lang === 'ar'
        ? "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى."
        : "Sorry, a connection error occurred. Please try again.",
      source: "general",
      lang,
    };
  }

  /* ------------------ Validate Response & Append Sources ------------------ */
  // Note: The prompt usually handles sources, but we verify here for consistency.

  const outputLower = modelOutput.toLowerCase();

  // Logic: Checking if we should append sources if missing.
  // We avoid appending sources if the response was the strict "No Answer" phrase
  // or if the AI decided it was "Natural Chat" (no sources needed).

  const isNoAnswerWrapper = modelOutput.includes("لا يوجد جواب لهذا السؤال");
  const hasSources = outputLower.includes("المصادر") || outputLower.includes("sources");

  if (!hasSources && !isNoAnswerWrapper) {
    // Heuristic: If we retrieved chunks and are in strict mode, and AI gave an answer (not denial),
    // it's likely a study answer that missed the footer.
    // But if it was "Natural Chat" (e.g. "Ahlan!"), we shouldn't append sources.
    // We can look for keywords like "صفحة" (Page) to guess if it was study.

    const seemsStudy = outputLower.includes("page") || outputLower.includes("صفحة");

    if (seemsStudy && sourceInfo && !input.expandSearchOnline) {
      modelOutput += `\n\n---\nالمصادر:\n- كتاب: ${sourceInfo.bookName} | صفحة: ${sourceInfo.pageNumber}`;
    } else if (input.expandSearchOnline) {
      // In web search mode, if no source, explicitly state General Knowledge
      modelOutput += `\n\n---\nالمصادر:\n- معرفة عامة / بحث`;
    }
  }

  /* ------------------ Cache & Return ------------------ */
  if (retrievedChunks.length > 0 || input.expandSearchOnline) {
    try {
      await saveAnswerToCache({
        question: cacheQuery,
        answer: modelOutput,
        branch: input.branch || null,
        book_id: retrievedChunks[0]?.book_id || null,
      });
    } catch { }
  }

  return {
    answer: modelOutput,
    source: input.expandSearchOnline ? "web" : (retrievedChunks.length > 0 ? "textbook" : "general"),
    sourceBookName: sourceInfo?.bookName,
    sourcePageNumber: sourceInfo?.pageNumber,
    lang,
  };
}
