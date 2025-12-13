'use server';

import { askAI } from '@/ai/router';
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
  });

  const lang: 'ar' | 'en' = input.language || (/[\u0600-\u06FF]/.test(input.question) ? 'ar' : 'en');

  /* ------------------ Cache Check ------------------ */
  const cached = await getCachedAnswer(input.question, input.branch);
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

  if (booksForContext.length > 0 && !input.expandSearchOnline) {
    try {
      const { supabaseAdmin } = await import("@/lib/supabase-admin");
      const { generateEmbedding } = await import("@/lib/embeddings");

      const qEmbedding = await generateEmbedding(input.question);
      const ids = booksForContext.map((b) => b.id);

      // Vector search
      const { data } = await supabaseAdmin.rpc("match_book_pages_v2", {
        query_embedding: qEmbedding,
        match_threshold: 0.15,
        match_count: 20,
        filter_book_ids: ids,
      });

      if (data && data.length > 0) {
        retrievedChunks = data;
        sourceInfo = {
          bookName: bookIdToName[data[0].book_id] || "كتاب",
          pageNumber: data[0].page_number,
        };

        // Build context with clear page markers
        context = data
          .map((p: any, i: number) =>
            `[مقطع ${i + 1}]\nالكتاب: ${bookIdToName[p.book_id] || "غير معروف"}\nالصفحة: ${p.page_number}\nالمحتوى:\n${p.content}\n---`
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

  /* ------------------ Build System Prompt ------------------ */
  let systemPrompt: string;

  if (input.expandSearchOnline) {
    // WEB SEARCH MODE
    systemPrompt = `أنت "توجيهي AI" - مساعد تعليمي ذكي لطلاب الثانوية العامة الفلسطينية.

## الوضع الحالي: البحث على الإنترنت مُفعّل ✅

يمكنك استخدام معرفتك العامة للإجابة.

## قواعد الإجابة:
1. أجب بشكل واضح ومنظم
2. استخدم تنسيق Markdown
3. استخدم LaTeX للمعادلات: $$formula$$

## المصادر (مطلوب دائماً):
يجب أن تنتهي إجابتك بـ:
---
**المصادر:**
- مصدر خارجي: [اسم المصدر]`;

  } else {
    // TEXTBOOK-ONLY MODE (STRICT)
    if (!context || retrievedChunks.length === 0) {
      // No context found - return immediately
      return {
        answer: lang === 'ar' ? NO_ANSWER_RESPONSE_AR : NO_ANSWER_RESPONSE_EN,
        source: "textbook",
        lang,
      };
    }

    systemPrompt = `أنت "توجيهي AI" - مساعد تعليمي ذكي لطلاب الثانوية العامة الفلسطينية.

## ⚠️ قواعد صارمة - يجب اتباعها بدقة:

1. **أجب فقط من المحتوى المقدم أدناه** - لا تستخدم أي معرفة خارجية
2. **إذا لم تجد الإجابة في المحتوى أدناه**، أجب بالضبط:
   "${NO_ANSWER_RESPONSE_AR}"
3. **لا تخمن أو تستنتج** معلومات غير موجودة
4. **لا تضف معلومات** من معرفتك العامة

## تنسيق الإجابة:
- استخدم Markdown
- استخدم LaTeX للمعادلات: $$formula$$
- كن مختصراً ودقيقاً

## المصادر (مطلوب دائماً):
يجب أن تنتهي كل إجابة بقسم المصادر بهذا الشكل بالضبط:
---
**المصادر:**
- كتاب: [اسم الكتاب] | صفحة: [رقم الصفحة]

## محتوى الكتاب المتاح للإجابة:
${context}

---
تذكر: أجب فقط مما هو موجود أعلاه. إذا لم تجد الجواب، قل ذلك بوضوح.`;
  }

  /* ------------------ History ------------------ */
  const rawHistory = (input.history ?? []).slice(-6).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  /* ------------------ Call AI ------------------ */
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

  /* ------------------ Validate Response ------------------ */
  // Ensure sources are included
  if (!modelOutput.includes("المصادر") && !modelOutput.includes("Sources")) {
    if (input.expandSearchOnline) {
      modelOutput += `\n\n---\n**المصادر:**\n- مصدر خارجي: معرفة عامة`;
    } else if (sourceInfo) {
      modelOutput += `\n\n---\n**المصادر:**\n- كتاب: ${sourceInfo.bookName} | صفحة: ${sourceInfo.pageNumber}`;
    }
  }

  /* ------------------ Cache & Return ------------------ */
  if (retrievedChunks.length > 0 || input.expandSearchOnline) {
    try {
      await saveAnswerToCache({
        question: input.question,
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