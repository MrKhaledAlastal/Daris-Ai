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
      // Ideally the frontend passes mime type, but here we assume jpeg for imageBase64 field
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
  // We prioritize the user question, but append extracted text for context.
  let queryForRAG = input.question;
  if (extractedContext) {
    queryForRAG = `${input.question}\n\n[SIA Context from Image/File]:\n${extractedContext}`;
  }

  const lang: 'ar' | 'en' = input.language || (/[\u0600-\u06FF]/.test(queryForRAG) ? 'ar' : 'en');

  /* ------------------ Cache Check ------------------ */
  // We use the queryForRAG to ensure cache is unique for the image content too
  const cached = await getCachedAnswer(queryForRAG, input.branch);
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

  /* ------------------ Validation ------------------ */
  if (booksForContext.length === 0 && !input.expandSearchOnline) {
    return {
      answer: lang === 'ar'
        ? "⚠️ يرجى اختيار الفرع الدراسي أولاً!"
        : "⚠️ Please select your Study Branch first!",
      source: "general",
      lang,
    };
  }

  /* ------------------ RAG Retrieval ------------------ */

  let context = "";
  let retrievedChunks: any[] = [];
  let sourceInfo: { bookName: string; pageNumber: number } | null = null;

  // 🔥 ALWAYS retrieve from books (whether web search is on or off)
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
              `[صفحة ${p.page_number}]
${p.content}`
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
    // 🌐 WEB SEARCH MODE: Use books + general knowledge

    const contextSection = context
      ? `## محتوى من الكتب المدرسية المتاحة:
${context}

---

`
      : '';

    // Also include extracted Vision text in the system prompt explicitly if needed, 
    // though it's already in the user question/RAG query. 
    // Let's add it to contextSection if context is empty to ensure AI sees it.
    const visionSection = extractedContext ? `\n## محتوى الصورة/الملف المرفق:\n${extractedContext}\n---\n` : "";

    const sourcesSection = sourceInfo
      ? `- كتاب: ${sourceInfo.bookName} | صفحة: ${sourceInfo.pageNumber}
- معلومات إضافية: معرفة عامة`
      : '- مصدر: معرفة عامة';

    systemPrompt = `أنت "توجيهي AI" - مساعد تعليمي ذكي لطلاب الثانوية العامة الفلسطينية.

## الوضع الحالي: البحث الموسّع مُفعّل ✅

يمكنك استخدام:
1. **المحتوى من الكتب المدرسية** (إن وُجد)
2. **محتوى الصورة/الملف المرفق** (إن وُجد)
3. **معرفتك العامة** لإثراء الإجابة

${visionSection}
${contextSection}
## قواعد الإجابة:
1. أولوية للمعلومات من الكتب (إن وُجدت)
2. أضف معلومات إضافية من معرفتك العامة
3. استخدم تنسيق Markdown واضح
4. استخدم LaTeX للمعادلات: $$formula$$
5. اشرح بشكل مفصّل ومبسّط

## المصادر (مطلوب دائماً):
يجب أن تنتهي إجابتك بـ:
---
**المصادر:**
${sourcesSection}`;

  } else {
    // 📚 TEXTBOOK-ONLY MODE (STRICT) with FALLBACK

    // Add extracted vision context to the "Available Content" if RAG failed but we have image text
    // BUT strictly, "Textbook Only" means we should only answer if RAG found something IN THE TEXTBOOK matching the image.
    // However, if the user asks "Explain this image", and RAG finds nothing, we should logically answer "No answer in textbook".
    // BUT the requirement says: "If no answer found... return 'No answer...'".

    // So if retrievedChunks is empty, we fail, unless we are in Fallback Mode.

    if (!context || retrievedChunks.length === 0) {
      // Fallback: No chunks found in book.

      systemPrompt = `أنت "توجيهي AI" - مساعد تعليمي ذكي.
      
## ⚠️ تنبيه هام:
لم يتم العثور على محتوى مطابق تماماً في الكتب المدرسية المتاحة لهذا السؤال.
لذلك، ستقوم بالإجابة بناءً على **المفاهيم العلمية العامة** للمنهج الفلسطيني.

## القواعد:
1. أجب عن السؤال بدقة علمية.
2. ابدأ إجابتك بعبارة: "**⚠️ لم أجد هذا الموضوع في الصفحات المفهرسة من الكتاب، ولكن إليك الشرح العام:**"
3. لا تذكر أرقام صفحات لأنك لا تملك المصدر.
4. استخدم LaTeX للمعادلات.

## السياق (من الصورة/الملف إن وجد):
${extractedContext}

## المصادر:
يجب أن تنتهي الإجابة بـ:
---
**المصادر:**
- مصدر: شرح عام (لم يتم العثور على نتائج في الكتاب)`;

    } else {
      // Normal Textbook Mode
      systemPrompt = `أنت "توجيهي AI" - مساعد تعليمي ذكي لطلاب الثانوية العامة الفلسطينية.

## ⚠️ قواعد صارمة - يجب اتباعها بدقة:

1. **أجب فقط من المحتوى المقدم أدناه** - لا تستخدم أي معرفة خارجية
2. **إذا لم تجد الإجابة في المحتوى أدناه**، أجب بالضبط:
   "${NO_ANSWER_RESPONSE_AR}"
3. **لا تخمن أو تستنتج** معلومات غير موجودة
4. **لا تضف معلومات** من معرفتك العامة

## تنسيق الإجابة (إلزامي):
1. قسّم الإجابة إلى فقرات واضحة
2. عند ذكر أي معلومة، ضع رقم الصفحة بعدها: (صفحة X)
3. استخدم LaTeX للمعادلات: $$formula$$

## محتوى الكتاب المتاح للإجابة:
${context}

${extractedContext ? `\n## محتوى إضافي من الصورة المرفقة (للاسترشاد فقط، المرجع الأساسي الكتاب):\n${extractedContext}` : ''}

---

## المصادر (مطلوب دائماً):
يجب أن تنتهي كل إجابة بـ:
---
**المصادر:**
- كتاب: ${sourceInfo!.bookName} | صفحة: ${sourceInfo!.pageNumber}`;
    }
  }

  /* ------------------ History ------------------ */
  const rawHistory = (input.history ?? []).slice(-6).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  /* ------------------ Call AI (Groq) ------------------ */
  let modelOutput: string;

  try {
    // We pass the ORIGINAL question to the AI, because the context (RAG + Vision) is now in the System Prompt.
    // OR we can pass the augmented query. Passing the original question is usually safer for the chat flow feel,
    // as long as the system prompt has all the info.
    modelOutput = await askAI({
      question: input.question, // The user's visible question
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

  /* ------------------ Validate Response ------------------ */
  // Ensure sources are included
  if (!modelOutput.includes("المصادر") && !modelOutput.includes("Sources")) {
    if (input.expandSearchOnline) {
      modelOutput += `\n\n---\n**المصادر:**\n- مصدر خارجي: معرفة عامة`;
    } else if (sourceInfo) {
      modelOutput += `\n\n---\n**المصادر:**\n- كتاب: ${sourceInfo.bookName} | صفحة: ${sourceInfo.pageNumber}`;
    } else {
      modelOutput += `\n\n---\n**المصادر:**\n- مصدر: شرح عام (لم يتم العثور على نتائج في الكتاب)`;
    }
  }

  /* ------------------ Cache & Return ------------------ */
  if (retrievedChunks.length > 0 || input.expandSearchOnline) {
    try {
      await saveAnswerToCache({
        question: queryForRAG, // Use the full query for caching key
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
